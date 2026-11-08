"""Universal Multi-Protocol HTTP Client supporting OpenAI, Anthropic, and Gemini formats."""
from dataclasses import dataclass
import json
from typing import Dict, List, Optional, Tuple
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


class UniversalLLMClient:
    """Universal client capable of querying both OpenAI-compatible and Anthropic-compatible endpoints with zero external dependencies."""

    def __init__(self, timeout: int = 45):
        self.timeout = timeout

    def format_request(
        self,
        config: CustomProviderConfig,
        user_prompt: str,
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.2,
    ) -> Tuple[str, Dict[str, str], bytes]:
        """Formats the URL, headers, and request body based on provider protocol (OpenAI or Anthropic)."""
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
            # If base_url already contains /messages, keep it, else append
            url = base_url if base_url.endswith("/messages") else f"{base_url}/messages"
            headers["x-api-key"] = api_key
            if "anthropic-version" not in headers:
                headers["anthropic-version"] = "2023-06-01"

            body = {
                "model": config.model,
                "messages": [{"role": "user", "content": user_prompt}],
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if system_prompt:
                body["system"] = system_prompt

        else:
            # OpenAI / Gemini OpenAI-Compatible Protocol: POST /chat/completions
            url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})

            body = {
                "model": config.model,
                "messages": messages,
                "temperature": temperature,
            }

        payload = json.dumps(body).encode("utf-8")
        return url, headers, payload

    def parse_response(self, config: CustomProviderConfig, raw_json: dict) -> LLMResponse:
        """Parses output text and tokens from provider response according to protocol."""
        protocol = config.protocol.lower()
        content = ""
        tokens_used = 500

        if protocol == "anthropic":
            # Anthropic response: {"content": [{"type": "text", "text": "..."}], "usage": {"input_tokens": 10, "output_tokens": 20}}
            content_blocks = raw_json.get("content", [])
            for block in content_blocks:
                if block.get("type") == "text":
                    content += block.get("text", "")
            usage = raw_json.get("usage", {})
            tokens_used = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
        else:
            # OpenAI response: {"choices": [{"message": {"content": "..."}}], "usage": {"total_tokens": 30}}
            choices = raw_json.get("choices", [])
            if choices:
                msg = choices[0].get("message", {})
                content = msg.get("content", "")
            usage = raw_json.get("usage", {})
            tokens_used = usage.get("total_tokens", 500)

        return LLMResponse(
            content=content.strip(),
            tokens_used=tokens_used,
            model_name=config.model,
            provider_id=config.id,
            raw_response=raw_json,
        )

    def generate(
        self,
        config: CustomProviderConfig,
        user_prompt: str,
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """Executes an HTTP request to the provider and returns standardized LLMResponse."""
        url, headers, payload = self.format_request(
            config=config,
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
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
