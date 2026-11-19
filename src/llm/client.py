"""Universal Multi-Protocol HTTP Client supporting OpenAI, Anthropic, and Gemini formats."""
import base64
from dataclasses import dataclass
import json
from typing import Any, Dict, List, Optional, Tuple
import urllib.request
import urllib.error

from src.llm.config_manager import CustomProviderConfig


@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    content: str
    tokens_used: int
    model_name: str
    provider_id: str
    raw_response: dict
    tool_calls: Optional[List[Dict[str, Any]]] = None
    finish_reason: Optional[str] = None


class UniversalLLMClient:
    """Universal client capable of querying both OpenAI-compatible and Anthropic-compatible endpoints with zero external dependencies."""

    def __init__(self, timeout: int = 45):
        self.timeout = timeout

    def format_request(
        self,
        config: CustomProviderConfig,
        user_prompt: str = "",
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.2,
        image_data: Optional[bytes] = None,
        image_mime_type: str = "image/jpeg",
        tools: Optional[List[Dict[str, Any]]] = None,
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[str, Dict[str, str], bytes]:
        """Formats the URL, headers, and request body based on provider protocol (OpenAI or Anthropic), including multimodal vision support and typed tool calling."""
        base_url = config.resolve_base_url().rstrip("/")
        api_key = config.resolve_api_key()

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "OpenFamilyOffice/1.0",
        }
        headers.update(config.custom_headers)

        protocol = config.protocol.lower()

        if protocol == "anthropic":
            # Anthropic Protocol: POST /messages
            url = base_url if base_url.endswith("/messages") else f"{base_url}/messages"
            headers["x-api-key"] = api_key
            if "anthropic-version" not in headers:
                headers["anthropic-version"] = "2023-06-01"

            if messages:
                # Filter out system messages for Anthropic, place into body["system"]
                anthropic_messages = []
                extracted_system = system_prompt
                for m in messages:
                    if m.get("role") == "system":
                        extracted_system = m.get("content", "")
                    else:
                        anthropic_messages.append(m)
            elif image_data:
                b64_image = base64.b64encode(image_data).decode("utf-8")
                user_content = [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_mime_type,
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": user_prompt},
                ]
                anthropic_messages = [{"role": "user", "content": user_content}]
                extracted_system = system_prompt
            else:
                anthropic_messages = [{"role": "user", "content": user_prompt}]
                extracted_system = system_prompt

            body = {
                "model": config.model,
                "messages": anthropic_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if extracted_system:
                body["system"] = extracted_system

            if tools:
                anthropic_tools = []
                for t in tools:
                    fn = t.get("function", t)
                    anthropic_tools.append({
                        "name": fn.get("name"),
                        "description": fn.get("description", ""),
                        "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
                    })
                body["tools"] = anthropic_tools

        else:
            # OpenAI / Gemini OpenAI-Compatible Protocol: POST /chat/completions
            url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            if messages:
                req_messages = list(messages)
                if system_prompt and not any(m.get("role") == "system" for m in req_messages):
                    req_messages.insert(0, {"role": "system", "content": system_prompt})
            else:
                req_messages = []
                if system_prompt:
                    req_messages.append({"role": "system", "content": system_prompt})

                if image_data:
                    b64_image = base64.b64encode(image_data).decode("utf-8")
                    user_content = [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_mime_type};base64,{b64_image}"
                            },
                        },
                    ]
                    req_messages.append({"role": "user", "content": user_content})
                else:
                    req_messages.append({"role": "user", "content": user_prompt})

            body = {
                "model": config.model,
                "messages": req_messages,
                "temperature": temperature,
            }
            if tools:
                body["tools"] = tools
                body["tool_choice"] = "auto"

        payload = json.dumps(body).encode("utf-8")
        return url, headers, payload

    def parse_response(self, config: CustomProviderConfig, raw_json: dict) -> LLMResponse:
        """Parses output text, tokens, and typed tool calls from provider response according to protocol."""
        protocol = config.protocol.lower()
        content = ""
        tokens_used = 500
        tool_calls: Optional[List[Dict[str, Any]]] = None
        finish_reason: Optional[str] = None

        if protocol == "anthropic":
            # Anthropic response: {"content": [{"type": "text", "text": "..."}, {"type": "tool_use", "id": "...", "name": "...", "input": {...}}], "usage": {"input_tokens": 10, "output_tokens": 20}}
            content_blocks = raw_json.get("content", [])
            for block in content_blocks:
                b_type = block.get("type")
                if b_type == "text":
                    content += block.get("text", "")
                elif b_type == "tool_use":
                    if tool_calls is None:
                        tool_calls = []
                    tool_calls.append({
                        "id": block.get("id"),
                        "name": block.get("name"),
                        "arguments": block.get("input", {}),
                    })
            usage = raw_json.get("usage", {})
            tokens_used = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            finish_reason = raw_json.get("stop_reason")
        else:
            # OpenAI response: {"choices": [{"message": {"content": "...", "tool_calls": [...]}, "finish_reason": "..."}], "usage": {"total_tokens": 30}}
            choices = raw_json.get("choices", [])
            if choices:
                first = choices[0]
                msg = first.get("message", {})
                content = msg.get("content") or ""
                finish_reason = first.get("finish_reason")
                raw_tcs = msg.get("tool_calls")
                if raw_tcs:
                    tool_calls = []
                    for tc in raw_tcs:
                        fn = tc.get("function", {})
                        args_raw = fn.get("arguments", "{}")
                        try:
                            parsed_args = json.loads(args_raw) if isinstance(args_raw, str) else args_raw
                        except Exception:
                            parsed_args = {}
                        tool_calls.append({
                            "id": tc.get("id"),
                            "name": fn.get("name"),
                            "arguments": parsed_args,
                        })

            usage = raw_json.get("usage", {})
            tokens_used = usage.get("total_tokens", 500)

        return LLMResponse(
            content=content.strip(),
            tokens_used=tokens_used,
            model_name=config.model,
            provider_id=config.id,
            raw_response=raw_json,
            tool_calls=tool_calls,
            finish_reason=finish_reason,
        )

    def generate(
        self,
        config: CustomProviderConfig,
        user_prompt: str = "",
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.2,
        image_data: Optional[bytes] = None,
        image_mime_type: str = "image/jpeg",
        tools: Optional[List[Dict[str, Any]]] = None,
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        """Executes an HTTP request to the provider and returns standardized LLMResponse."""
        url, headers, payload = self.format_request(
            config=config,
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            image_data=image_data,
            image_mime_type=image_mime_type,
            tools=tools,
            messages=messages,
        )

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return self.parse_response(config, data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"LLM API Error ({config.id} [{e.code}]): {error_body}") from e
        except Exception as e:
            raise RuntimeError(f"Connection Error ({config.id}): {str(e)}") from e
