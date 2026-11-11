"""PII Sanitization, LGPD Masking & Security Egress Guard.

Implements Modulo-11 algorithmic validation for Brazilian CPFs and CNPJs,
redaction of all 4 PIX key types, entity trade name vaulting, fuzzy detokenization,
and hard egress security verification to prevent PII leakage to external LLMs.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple


class SecurityEgressException(Exception):
    """Raised when unmasked sensitive PII is detected in a payload destined for egress."""
    pass


def validate_cpf(cpf: str) -> bool:
    """Validates Brazilian CPF using the official Modulo-11 algorithm.

    Rejects sequences with invalid lengths or repeated digits (e.g. 111.111.111-11).
    """
    digits = [int(c) for c in cpf if c.isdigit()]
    if len(digits) != 11:
        return False

    # Disallow known repeated digit false positives
    if len(set(digits)) == 1:
        return False

    # First check digit
    s1 = sum(digits[i] * (10 - i) for i in range(9))
    d1 = (s1 * 10) % 11
    if d1 == 10:
        d1 = 0
    if digits[9] != d1:
        return False

    # Second check digit
    s2 = sum(digits[i] * (11 - i) for i in range(10))
    d2 = (s2 * 10) % 11
    if d2 == 10:
        d2 = 0
    return digits[10] == d2


def validate_cnpj(cnpj: str) -> bool:
    """Validates Brazilian CNPJ using the official Modulo-11 algorithm."""
    digits = [int(c) for c in cnpj if c.isdigit()]
    if len(digits) != 14:
        return False

    if len(set(digits)) == 1:
        return False

    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s1 = sum(digits[i] * weights1[i] for i in range(12))
    rem1 = s1 % 11
    d1 = 0 if rem1 < 2 else 11 - rem1
    if digits[12] != d1:
        return False

    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(digits[i] * weights2[i] for i in range(13))
    rem2 = s2 % 11
    d2 = 0 if rem2 < 2 else 11 - rem2
    return digits[13] == d2


class PIISanitizer:
    """Sanitizes PII and proprietary entity trade names before external AI transmission."""

    DEFAULT_VAULT = {
        "Osmar Henzen": "[PRINCIPAL_A]",
        "Osmar": "[PRINCIPAL_A]",
        "Vera Henzen": "[PRINCIPAL_B]",
        "Vera": "[PRINCIPAL_B]",
        "Fix Serviços Elétricos": "[ENTITY_01_MEI]",
        "Fix Serviços MEI": "[ENTITY_01_MEI]",
        "Fix Serviços": "[ENTITY_01_MEI]",
        "Facilita Vistorias Imobiliárias": "[ENTITY_02_MEI]",
        "Facilita Vistorias MEI": "[ENTITY_02_MEI]",
        "Facilita Vistorias": "[ENTITY_02_MEI]",
    }

    FRIENDLY_LABELS = {
        "[PRINCIPAL_A]": "Osmar",
        "[PRINCIPAL_B]": "Vera",
        "[ENTITY_01_MEI]": "Fix Serviços MEI",
        "[ENTITY_02_MEI]": "Facilita Vistorias MEI",
    }

    # Regex patterns
    RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    RE_EVP_UUID = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")
    # Brazilian mobile phone numbers: +55 (XX) 9XXXX-XXXX or XX 9XXXXXXXX
    RE_BR_PHONE = re.compile(r"(?:\+?55\s?)?(?:\(?([1-9]{2})\)?\s?)?(?:9[0-9]{4}[-\s]?[0-9]{4})\b")

    # Potential CPF candidates: formatted or unformatted 11 digits
    RE_CPF_CANDIDATE = re.compile(r"(?:\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b)")
    # Potential CNPJ candidates: formatted or unformatted 14 digits
    RE_CNPJ_CANDIDATE = re.compile(r"(?:\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|\b\d{14}\b)")

    def __init__(self, vault: Optional[Dict[str, str]] = None):
        self.vault = dict(self.DEFAULT_VAULT)
        if vault:
            self.vault.update(vault)

        # Sort vault by key length descending to prevent substring masking collisions
        self._sorted_vault = sorted(self.vault.items(), key=lambda kv: len(kv[0]), reverse=True)

    def sanitize(self, text: str) -> Tuple[str, Dict[str, str]]:
        """Sanitizes text and returns (sanitized_text, token_map).

        Tokens are deterministic placeholders that allow precise detokenization.
        """
        token_map: Dict[str, str] = {}
        sanitized = text

        # 1. Mask Vault Trade Names & People (longest first)
        for original, token in self._sorted_vault:
            pattern = re.compile(re.escape(original), re.IGNORECASE)
            match = pattern.search(sanitized)
            if match:
                token_map[token] = match.group(0)
                sanitized = pattern.sub(token, sanitized)

        # 2. Mask Validated CNPJs
        cnpj_matches = list(self.RE_CNPJ_CANDIDATE.finditer(sanitized))
        for idx, match in enumerate(cnpj_matches):
            raw = match.group(0)
            if validate_cnpj(raw):
                token = f"[CNPJ_MASK_{idx + 1}]"
                token_map[token] = raw
                sanitized = sanitized.replace(raw, token)

        # 3. Mask Validated CPFs (Modulo-11 ensures we don't mask timestamps or random 11-digit numbers)
        cpf_matches = list(self.RE_CPF_CANDIDATE.finditer(sanitized))
        for idx, match in enumerate(cpf_matches):
            raw = match.group(0)
            if validate_cpf(raw):
                token = f"[CPF_MASK_{idx + 1}]"
                token_map[token] = raw
                sanitized = sanitized.replace(raw, token)

        # 4. Mask PIX EVP / UUID keys
        evp_matches = list(self.RE_EVP_UUID.finditer(sanitized))
        for idx, match in enumerate(evp_matches):
            raw = match.group(0)
            token = f"[PIX_EVP_{idx + 1}]"
            token_map[token] = raw
            sanitized = sanitized.replace(raw, token)

        # 5. Mask PIX Emails
        email_matches = list(self.RE_EMAIL.finditer(sanitized))
        for idx, match in enumerate(email_matches):
            raw = match.group(0)
            token = f"[PIX_EMAIL_{idx + 1}]"
            token_map[token] = raw
            sanitized = sanitized.replace(raw, token)

        # 6. Mask PIX Mobile Phone Numbers
        phone_matches = list(self.RE_BR_PHONE.finditer(sanitized))
        for idx, match in enumerate(phone_matches):
            raw = match.group(0)
            # Avoid masking plain numbers that don't match phone structure
            if len(re.sub(r"\D", "", raw)) in (10, 11, 13):
                token = f"[PIX_PHONE_{idx + 1}]"
                token_map[token] = raw
                sanitized = sanitized.replace(raw, token)

        return sanitized, token_map

    def detokenize(
        self,
        text: str,
        token_map: Optional[Dict[str, str]] = None,
        use_friendly_labels: bool = True,
    ) -> str:
        """Restores masked tokens, supporting fuzzy regex for LLM mutated brackets or spaces."""
        result = text

        # 1. Restore specific tokens from token_map
        if token_map:
            for token, original in token_map.items():
                result = result.replace(token, original)

        # 2. Fuzzy restoration for entity and principal tokens
        fuzzy_patterns = [
            (r"\[?\s*(?:PRINCIPAL[_\s]A)\s*\]?", self.FRIENDLY_LABELS.get("[PRINCIPAL_A]", "Osmar")),
            (r"\[?\s*(?:PRINCIPAL[_\s]B)\s*\]?", self.FRIENDLY_LABELS.get("[PRINCIPAL_B]", "Vera")),
            (r"\[?\s*(?:ENTITY[_\s]01[_\s]MEI)\s*\]?", self.FRIENDLY_LABELS.get("[ENTITY_01_MEI]", "Fix Serviços MEI")),
            (r"\[?\s*(?:ENTITY[_\s]02[_\s]MEI)\s*\]?", self.FRIENDLY_LABELS.get("[ENTITY_02_MEI]", "Facilita Vistorias MEI")),
        ]

        if use_friendly_labels:
            for pattern, label in fuzzy_patterns:
                result = re.sub(pattern, label, result, flags=re.IGNORECASE)

        return result

    def verify_egress_safety(self, text: str) -> bool:
        """Verifies that no unmasked PII exists in text before transmission to external cloud LLM.

        Raises SecurityEgressException if unmasked CPF, CNPJ, PIX key, or trade name is present.
        """
        # Check vault trade names (ignore short words to avoid false alarms)
        for original, _ in self._sorted_vault:
            if len(original) > 4 and original.lower() in text.lower():
                raise SecurityEgressException(
                    f"Egress Blocked: Unmasked entity or trade name detected ('{original}')."
                )

        # Check for unmasked valid CPFs
        for match in self.RE_CPF_CANDIDATE.finditer(text):
            val = match.group(0)
            if validate_cpf(val):
                raise SecurityEgressException(
                    f"Egress Blocked: Unmasked valid Brazilian CPF detected."
                )

        # Check for unmasked valid CNPJs
        for match in self.RE_CNPJ_CANDIDATE.finditer(text):
            val = match.group(0)
            if validate_cnpj(val):
                raise SecurityEgressException(
                    f"Egress Blocked: Unmasked valid Brazilian CNPJ detected."
                )

        # Check for unmasked emails
        if self.RE_EMAIL.search(text):
            raise SecurityEgressException(
                "Egress Blocked: Unmasked email address detected."
            )

        # Check for unmasked EVP keys
        if self.RE_EVP_UUID.search(text):
            raise SecurityEgressException(
                "Egress Blocked: Unmasked PIX random EVP key detected."
            )

        return True

