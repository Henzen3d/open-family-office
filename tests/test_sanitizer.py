"""Unit tests for PII Sanitizer, Modulo-11 Validators, and Security Egress Guard."""

import pytest
from src.security.sanitizer import (
    PIISanitizer,
    SecurityEgressException,
    validate_cnpj,
    validate_cpf,
)


# Known valid test CPFs generated via official Modulo-11 rules
VALID_CPF_FORMATTED = "529.982.247-25"
VALID_CPF_RAW = "52998224725"
INVALID_CPF_DIGIT = "529.982.247-99"
INVALID_CPF_REPEATED = "111.111.111-11"

# Known valid test CNPJs
VALID_CNPJ_FORMATTED = "11.222.333/0001-81"
VALID_CNPJ_RAW = "11222333000181"
INVALID_CNPJ_DIGIT = "11.222.333/0001-99"
INVALID_CNPJ_REPEATED = "00.000.000/0000-00"


def test_cpf_validator():
    assert validate_cpf(VALID_CPF_FORMATTED) is True
    assert validate_cpf(VALID_CPF_RAW) is True
    assert validate_cpf(INVALID_CPF_DIGIT) is False
    assert validate_cpf(INVALID_CPF_REPEATED) is False
    assert validate_cpf("12345") is False
    assert validate_cpf("abcdefghijk") is False


def test_cnpj_validator():
    assert validate_cnpj(VALID_CNPJ_FORMATTED) is True
    assert validate_cnpj(VALID_CNPJ_RAW) is True
    assert validate_cnpj(INVALID_CNPJ_DIGIT) is False
    assert validate_cnpj(INVALID_CNPJ_REPEATED) is False
    assert validate_cnpj("123456789") is False


def test_sanitizer_trade_names():
    sanitizer = PIISanitizer()
    text = "O titular Osmar da Fix Serviços MEI realizou um pagamento para Vera na Facilita Vistorias."
    sanitized, tokens = sanitizer.sanitize(text)

    assert "[PRINCIPAL_A]" in sanitized
    assert "[PRINCIPAL_B]" in sanitized
    assert "[ENTITY_01_MEI]" in sanitized
    assert "[ENTITY_02_MEI]" in sanitized
    assert "Fix Serviços" not in sanitized
    assert "Facilita Vistorias" not in sanitized


def test_sanitizer_cpf_and_cnpj():
    sanitizer = PIISanitizer()
    text = f"Cliente CPF {VALID_CPF_FORMATTED} e fornecedor CNPJ {VALID_CNPJ_FORMATTED} pagaram PIX."
    sanitized, tokens = sanitizer.sanitize(text)

    assert VALID_CPF_FORMATTED not in sanitized
    assert VALID_CNPJ_FORMATTED not in sanitized
    assert "[CPF_MASK_1]" in sanitized
    assert "[CNPJ_MASK_1]" in sanitized

    # Timestamps and plain numbers must NOT be masked
    plain_text = "Em 2026-11-08 o valor foi 12345678901 com id 98765432100."
    sanitized_plain, _ = sanitizer.sanitize(plain_text)
    assert "2026-11-08" in sanitized_plain


def test_sanitizer_pix_keys():
    sanitizer = PIISanitizer()
    text = (
        "Chaves PIX: email contato@fixservicos.com.br, "
        "telefone +55 (11) 98765-4321 e EVP 123e4567-e89b-12d3-a456-426614174000."
    )
    sanitized, tokens = sanitizer.sanitize(text)

    assert "contato@fixservicos.com.br" not in sanitized
    assert "+55 (11) 98765-4321" not in sanitized
    assert "123e4567-e89b-12d3-a456-426614174000" not in sanitized
    assert "[PIX_EMAIL_1]" in sanitized
    assert "[PIX_PHONE_1]" in sanitized
    assert "[PIX_EVP_1]" in sanitized


def test_detokenizer_exact_and_fuzzy():
    sanitizer = PIISanitizer()
    # Test fuzzy restoration of tokens mutated by LLM
    llm_output = (
        "Recomendação para [ENTITY_01_MEI]: O gestor PRINCIPAL_A deve "
        "reconciliar a transferência com [PRINCIPAL B] na [ENTITY 02 MEI]."
    )
    restored = sanitizer.detokenize(llm_output, use_friendly_labels=True)

    assert "Fix Serviços MEI" in restored
    assert "Osmar" in restored
    assert "Vera" in restored
    assert "Facilita Vistorias MEI" in restored


def test_egress_guard():
    sanitizer = PIISanitizer()

    # Sanitized text passes
    safe_text = "O faturamento do mês foi de R$ 45.000,00 com 11,2 meses de runway."
    assert sanitizer.verify_egress_safety(safe_text) is True

    # Unmasked CPF must fail
    with pytest.raises(SecurityEgressException, match="Unmasked valid Brazilian CPF"):
        sanitizer.verify_egress_safety(f"Dados do cliente: CPF {VALID_CPF_RAW}")

    # Unmasked CNPJ must fail
    with pytest.raises(SecurityEgressException, match="Unmasked valid Brazilian CNPJ"):
        sanitizer.verify_egress_safety(f"Empresa: {VALID_CNPJ_RAW}")

    # Unmasked trade name must fail
    with pytest.raises(SecurityEgressException, match="Unmasked entity or trade name"):
        sanitizer.verify_egress_safety("Transferência recebida da Fix Serviços.")

    # Unmasked email must fail
    with pytest.raises(SecurityEgressException, match="Unmasked email address"):
        sanitizer.verify_egress_safety("Email do titular: financeiro@empresa.com")

    # Unmasked EVP must fail
    with pytest.raises(SecurityEgressException, match="Unmasked PIX random EVP key"):
        sanitizer.verify_egress_safety("Chave evp: a1b2c3d4-e5f6-7890-abcd-ef1234567890")

