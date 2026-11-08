"""Importer for environment variables (.env) from NexusLocal, Multi+, or local files."""
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
            "model": "llama3.3-70b",
            "priority": 4,
            "limits": ProviderLimits(rpm_limit=30, tpm_limit=60000, rpd_limit=14400, proactive_threshold_pct=0.80),
        },
        "SAMBANOVA_API_KEY": {
            "id": "sambanova-fast",
            "name": "SambaNova Systems",
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
        "ANTHROPIC_API_KEY": {
            "id": "anthropic-claude",
            "name": "Anthropic Claude (Official/Compatible)",
            "protocol": "anthropic",
            "base_url": "https://api.anthropic.com/v1",
            "model": "claude-3-5-sonnet-20241022",
            "priority": 8,
            "limits": ProviderLimits(rpm_limit=50, tpm_limit=40000, rpd_limit=1000, proactive_threshold_pct=0.80),
            "custom_headers": {"anthropic-version": "2023-06-01"},
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

    def import_from_env_file(self, env_filepath: str, manager: ProviderConfigManager) -> List[Tuple[str, str]]:
        """Imports recognized keys from .env file into the ProviderConfigManager.
        Returns a list of (provider_id, provider_name) that were imported or updated.
        """
        env_vars = self.parse_env_file(env_filepath)
        imported: List[Tuple[str, str]] = []

        for env_key, meta in self.KNOWN_MAPPINGS.items():
            if env_key in env_vars and env_vars[env_key]:
                secret_key = env_vars[env_key]
                cfg = CustomProviderConfig(
                    id=meta["id"],
                    name=meta["name"],
                    protocol=meta["protocol"],
                    base_url=meta["base_url"],
                    api_key=secret_key,
                    model=meta["model"],
                    priority=meta["priority"],
                    enabled=True,
                    limits=meta["limits"],
                    custom_headers=meta.get("custom_headers", {}),
                )
                manager.add_provider(cfg)
                imported.append((cfg.id, cfg.name))

        # Check for custom Ollama / local URL
        ollama_url = env_vars.get("OLLAMA_BASE_URL") or env_vars.get("LOCAL_LLM_URL")
        if ollama_url:
            local_cfg = CustomProviderConfig(
                id="local-ollama",
                name="Local Ollama / NexusLocal",
                protocol="openai",
                base_url=ollama_url.rstrip("/"),
                api_key="ollama",
                model=env_vars.get("OLLAMA_MODEL", "qwen2.5:14b"),
                priority=99,
                enabled=True,
                limits=ProviderLimits(rpm_limit=9999, tpm_limit=9999999, rpd_limit=999999, proactive_threshold_pct=0.99),
            )
            manager.add_provider(local_cfg)
            imported.append((local_cfg.id, local_cfg.name))

        return imported
