"""Provider Configuration Manager supporting dynamic registration, .env, and JSON persistence."""
from dataclasses import dataclass, field, asdict
import json
import os
import re
from typing import Dict, List, Optional

from src.llm.rate_limiter import ProviderLimits


@dataclass
class CustomProviderConfig:
    """Configuration for an LLM provider (OpenAI, Anthropic, or Gemini compatible)."""
    id: str
    name: str
    protocol: str       # "openai", "anthropic", "gemini"
    base_url: str       # e.g. "https://api.anthropic.com/v1" or "https://api.groq.com/openai/v1"
    api_key: str        # Secret key or "${VAR_NAME}"
    model: str          # e.g. "claude-3-5-sonnet-20241022", "llama-3.3-70b-versatile"
    priority: int = 1   # Lower number = higher priority in fallback
    enabled: bool = True
    limits: ProviderLimits = field(default_factory=lambda: ProviderLimits(rpm_limit=30, tpm_limit=30000, rpd_limit=5000))
    custom_headers: Dict[str, str] = field(default_factory=dict)

    def resolve_api_key(self) -> str:
        """Resolves ${ENV_VAR} to actual value from environment if present."""
        if self.api_key.startswith("${") and self.api_key.endswith("}"):
            var_name = self.api_key[2:-1]
            return os.environ.get(var_name, "")
        return self.api_key

    def resolve_base_url(self) -> str:
        """Resolves ${ENV_VAR} in base_url if present."""
        if self.base_url.startswith("${") and self.base_url.endswith("}"):
            var_name = self.base_url[2:-1]
            return os.environ.get(var_name, "")
        return self.base_url


class ProviderConfigManager:
    """Manages reading, writing, and registering dynamic LLM providers."""

    def __init__(self, config_path: str = "config/providers.json", example_path: str = "config/providers.example.json"):
        self.config_path = config_path
        self.example_path = example_path
        self.providers: Dict[str, CustomProviderConfig] = {}
        self.load_providers()

    def load_providers(self):
        """Loads providers from JSON config or example template."""
        target_file = self.config_path if os.path.exists(self.config_path) else self.example_path
        if not os.path.exists(target_file):
            return

        try:
            with open(target_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    lim_data = item.get("limits", {})
                    limits = ProviderLimits(
                        rpm_limit=lim_data.get("rpm_limit", 30),
                        tpm_limit=lim_data.get("tpm_limit", 30000),
                        rpd_limit=lim_data.get("rpd_limit", 5000),
                        proactive_threshold_pct=lim_data.get("proactive_threshold_pct", 0.80),
                    )
                    cfg = CustomProviderConfig(
                        id=item["id"],
                        name=item["name"],
                        protocol=item.get("protocol", "openai").lower(),
                        base_url=item["base_url"].rstrip("/"),
                        api_key=item.get("api_key", ""),
                        model=item["model"],
                        priority=item.get("priority", 1),
                        enabled=item.get("enabled", True),
                        limits=limits,
                        custom_headers=item.get("custom_headers", {}),
                    )
                    self.providers[cfg.id] = cfg
        except Exception as e:
            print(f"Warning: Failed to load provider config from {target_file}: {e}")

    def save_providers(self):
        """Persists registered providers to config/providers.json."""
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        serializable = []
        for p in sorted(self.providers.values(), key=lambda x: x.priority):
            serializable.append({
                "id": p.id,
                "name": p.name,
                "protocol": p.protocol,
                "base_url": p.base_url,
                "api_key": p.api_key,
                "model": p.model,
                "priority": p.priority,
                "enabled": p.enabled,
                "limits": {
                    "rpm_limit": p.limits.rpm_limit,
                    "tpm_limit": p.limits.tpm_limit,
                    "rpd_limit": p.limits.rpd_limit,
                    "proactive_threshold_pct": p.limits.proactive_threshold_pct,
                },
                "custom_headers": p.custom_headers,
            })
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, ensure_ascii=False)

    def add_provider(self, config: CustomProviderConfig):
        """Registers a new custom provider."""
        self.providers[config.id] = config
        self.save_providers()

    def remove_provider(self, provider_id: str) -> bool:
        """Removes a provider by ID."""
        if provider_id in self.providers:
            del self.providers[provider_id]
            self.save_providers()
            return True
        return False

    def list_providers(self, enabled_only: bool = False) -> List[CustomProviderConfig]:
        """Returns sorted list of registered providers."""
        provs = list(self.providers.values())
        if enabled_only:
            provs = [p for p in provs if p.enabled]
        provs.sort(key=lambda p: p.priority)
        return provs

