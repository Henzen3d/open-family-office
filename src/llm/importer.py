"""Importer for environment variables (.env) from Multi+, Hermes, or local environment files."""
import os
import re
from typing import Dict, List, Tuple

from src.llm.config_manager import CustomProviderConfig, ProviderConfigManager
from src.llm.rate_limiter import ProviderLimits


class EnvImporter:
    """Imports API keys and provider definitions from .env files into OpenFamilyOffice configuration."""

    KNOWN_MAPPINGS = {
        "GEMINI_API_KEY": {
            "id": "gemini-free",
            "name": "Google Gemini 2.0 Flash (Free Tier)",
            "protocol": "gemini",
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
            "model": "gemini-2.0-flash",
            "priority": 1,
            "limits": ProviderLimits(rpm_limit=15, tpm_limit=1000000, rpd_limit=1500, proactive_threshold_pct=0.80),
        },
        "GROQ_API_KEY": {
            "id": "groq-free",
            "name": "Groq Ultra-Fast (Free Tier)",
            "protocol": "openai",
            "base_url": "https://api.groq.com/openai/v1",
            "model": "llama-3.3-70b-versatile",
            "priority": 2,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=30000, rpd_limit=14400, proactive_threshold_pct=0.80),
        },
        "OPENROUTER_API_KEY": {
            "id": "openrouter-free",
            "name": "OpenRouter Community Free Models",
            "protocol": "openai",
            "base_url": "https://openrouter.ai/api/v1",
            "model": "meta-llama/llama-3.3-70b-instruct:free",
            "priority": 3,
            "limits": ProviderLimits(rpm_limit=20, tpm_limit=20000, rpd_limit=1000, proactive_threshold_pct=0.80),
        },
        "CEREBRAS_API_KEY": {
            "id": "cerebras-fast",
            "name": "Cerebras Fast Inference",
            "protocol": "openai",
            "base_url": "https://api.cerebras.ai/v1",
            "model": "llama-3.3-70b",
            "priority": 4,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=60000, rpd_limit=14400, proactive_threshold_pct=0.80),
        },
        "SAMBANOVA_API_KEY": {
            "id": "sambanova-fast",
            "name": "SambaNova Systems (Free Tier)",
            "protocol": "openai",
            "base_url": "https://api.sambanova.ai/v1",
            "model": "Meta-Llama-3.3-70B-Instruct",
            "priority": 5,
            "limits": ProviderLimits(rpm_limit=20, tpm_limit=20000, rpd_limit=1000, proactive_threshold_pct=0.80),
        },
        "DEEPSEEK_API_KEY": {
            "id": "deepseek-api",
            "name": "DeepSeek AI",
            "protocol": "openai",
            "base_url": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
            "priority": 6,
            "limits": ProviderLimits(rpm_limit=60, tpm_limit=100000, rpd_limit=5000, proactive_threshold_pct=0.80),
        },
        "MISTRAL_API_KEY": {
            "id": "mistral-api",
            "name": "Mistral AI",
            "protocol": "openai",
            "base_url": "https://api.mistral.ai/v1",
            "model": "mistral-small-latest",
            "priority": 7,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=40000, rpd_limit=2000, proactive_threshold_pct=0.80),
        },
        "NVIDIA_API_KEY": {
            "id": "nvidia-nim",
            "name": "NVIDIA NIM APIs (build.nvidia.com)",
            "protocol": "openai",
            "base_url": "https://integrate.api.nvidia.com/v1",
            "model": "meta/llama-3.3-70b-instruct",
            "priority": 4,
            "limits": ProviderLimits(rpm_limit=40, tpm_limit=60000, rpd_limit=5000, proactive_threshold_pct=0.80),
        },
        "NVIDIA_NIM_API_KEY": {
            "id": "nvidia-nim",
            "name": "NVIDIA NIM APIs (build.nvidia.com)",
            "protocol": "openai",
            "base_url": "https://integrate.api.nvidia.com/v1",
            "model": "meta/llama-3.3-70b-instruct",
            "priority": 4,
            "limits": ProviderLimits(rpm_limit=40, tpm_limit=60000, rpd_limit=5000, proactive_threshold_pct=0.80),
        },
        "SILICONFLOW_API_KEY": {
            "id": "siliconflow-api",
            "name": "SiliconFlow Free Models",
            "protocol": "openai",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-72B-Instruct",
            "priority": 9,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=50000, rpd_limit=2000, proactive_threshold_pct=0.80),
        },
        "QWEN_API_KEY": {
            "id": "qwen-dashscope",
            "name": "Qwen DashScope",
            "protocol": "openai",
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "model": "qwen-plus",
            "priority": 10,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=50000, rpd_limit=2000, proactive_threshold_pct=0.80),
        },
        "ANTHROPIC_API_KEY": {
            "id": "anthropic-claude",
            "name": "Anthropic Claude (Official/Compatible)",
            "protocol": "anthropic",
            "base_url": "https://api.anthropic.com/v1",
            "model": "claude-3-5-sonnet-20241022",
            "priority": 11,
            "limits": ProviderLimits(rpm_limit=50, tpm_limit=40000, rpd_limit=1000, proactive_threshold_pct=0.80),
            "custom_headers": {"anthropic-version": "2023-06-01"},
        },
        "OPENAI_API_KEY": {
            "id": "openai-official",
            "name": "OpenAI Official (GPT-4o-mini)",
            "protocol": "openai",
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "priority": 12,
            "limits": ProviderLimits(rpm_limit=60, tpm_limit=80000, rpd_limit=5000, proactive_threshold_pct=0.80),
        },
    }

    @staticmethod
    def parse_env_file(filepath: str) -> Dict[str, str]:
        """Parses a standard .env file into key-value pairs."""
        env_vars = {}
        if not os.path.exists(filepath):
            return env_vars

        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key and val:
                        env_vars[key] = val
        return env_vars

    @staticmethod
    def parse_env_content(content: str) -> Dict[str, str]:
        """Parses raw .env text string into key-value pairs."""
        env_vars = {}
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and val:
                    env_vars[key] = val
        return env_vars

    def import_from_dict(self, env_vars: Dict[str, str], manager: ProviderConfigManager) -> List[Tuple[str, str]]:
        """Imports recognized keys from an environment variable dictionary into the ProviderConfigManager."""
        imported: List[Tuple[str, str]] = []

        # 1. Standard known mappings
        for env_key, meta in self.KNOWN_MAPPINGS.items():
            val = env_vars.get(env_key)
            if val and len(val.strip()) > 3:
                secret_key = val.strip()
                # Check for dynamic base URL overrides (e.g. GEMINI_BASE_URL)
                base_url = meta["base_url"]
                if env_key == "GEMINI_API_KEY" and env_vars.get("GEMINI_BASE_URL"):
                    base_url = env_vars["GEMINI_BASE_URL"].rstrip("/")

                cfg = CustomProviderConfig(
                    id=meta["id"],
                    name=meta["name"],
                    protocol=meta["protocol"],
                    base_url=base_url,
                    api_key=secret_key,
                    model=meta["model"],
                    priority=meta["priority"],
                    enabled=True,
                    limits=meta["limits"],
                    custom_headers=meta.get("custom_headers", {}),
                )
                manager.add_provider(cfg)
                imported.append((cfg.id, cfg.name))

        # 2. Check for Anthropic-compatible custom base URL and token
        anthropic_url = env_vars.get("ANTHROPIC_BASE_URL")
        anthropic_token = env_vars.get("ANTHROPIC_AUTH_TOKEN") or env_vars.get("ANTHROPIC_API_KEY")
        if anthropic_url and anthropic_token:
            cfg = CustomProviderConfig(
                id="anthropic-custom",
                name="Anthropic Compatible Gateway",
                protocol="anthropic",
                base_url=anthropic_url.rstrip("/"),
                api_key=anthropic_token.strip(),
                model=env_vars.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                priority=13,
                enabled=True,
                limits=ProviderLimits(rpm_limit=40, tpm_limit=50000, rpd_limit=2000, proactive_threshold_pct=0.80),
                custom_headers={"anthropic-version": "2023-06-01"},
            )
            manager.add_provider(cfg)
            imported.append((cfg.id, cfg.name))

        # 3. Dynamic Routers & Custom Gateways
        custom_gateways = [
            ("SEEKAI_BASE_URL", "SEEKAI_API_KEY", "seekai-gateway", "SeekAI Router", "openai"),
            ("VYCEAI_BASE_URL", "VYCEAI_API_KEY", "vyceai-gateway", "VyceAI Router", "openai"),
            ("GOROUTER_BASE_URL", "GOROUTER_API_KEY", "gorouter-gateway", "GoRouter App", "openai"),
        ]
        for url_key, key_key, p_id, p_name, proto in custom_gateways:
            url_val = env_vars.get(url_key)
            key_val = env_vars.get(key_key)
            if url_val and key_val:
                cfg = CustomProviderConfig(
                    id=p_id,
                    name=p_name,
                    protocol=proto,
                    base_url=url_val.rstrip("/"),
                    api_key=key_val.strip(),
                    model="default",
                    priority=20,
                    enabled=True,
                    limits=ProviderLimits(rpm_limit=30, tpm_limit=40000, rpd_limit=2000, proactive_threshold_pct=0.80),
                )
                manager.add_provider(cfg)
                imported.append((cfg.id, cfg.name))

        return imported

    def import_from_env_file(self, env_filepath: str, manager: ProviderConfigManager) -> List[Tuple[str, str]]:
        """Imports recognized keys from .env file into the ProviderConfigManager."""
        env_vars = self.parse_env_file(env_filepath)
        return self.import_from_dict(env_vars, manager)

    def import_from_env_content(self, content: str, manager: ProviderConfigManager) -> List[Tuple[str, str]]:
        """Imports recognized keys from raw .env text string into the ProviderConfigManager."""
        env_vars = self.parse_env_content(content)
        return self.import_from_dict(env_vars, manager)
