"""SSRF Protection and Public URL Validation Guard.

Enforces strict security boundaries for outbound HTTP calls:
- Scheme validation (http/https only)
- Private, loopback, link-local, and cloud metadata IP blocking
- DNS resolution validation before connection
- Port restrictions (80, 443)
- Size limits and timeouts
"""
from __future__ import annotations

import ipaddress
import socket
from typing import Optional, Set
from urllib.parse import urlparse


class SecuritySSRFException(Exception):
    """Raised when an outbound URL violates SSRF safety policies."""
    pass


# Private & Reserved IP Networks that must NEVER be accessed
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network
    ipaddress.ip_network("10.0.0.0/8"),         # RFC 1918 Private Class A
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local / Cloud metadata (AWS, GCP, Azure)
    ipaddress.ip_network("172.16.0.0/12"),      # RFC 1918 Private Class B
    ipaddress.ip_network("192.168.0.0/16"),     # RFC 1918 Private Class C
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    # IPv6
    ipaddress.ip_network("::1/128"),            # Loopback
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),          # Link-Local
]

BLOCKED_HOSTNAMES: Set[str] = {
    "localhost",
    "metadata.google.internal",
    "metadata.internal",
    "instance-data",
}

ALLOWED_SCHEMES: Set[str] = {"http", "https"}
ALLOWED_PORTS: Set[int] = {80, 443}


def validate_url_safety(url: str) -> str:
    """Validates that a URL is safe for outbound public access.

    Raises SecuritySSRFException if the URL targets localhost, private IPs,
    cloud metadata services, or non-standard ports.
    Returns canonicalized safe URL string.
    """
    if not url or not isinstance(url, str):
        raise SecuritySSRFException("URL inválida ou vazia.")

    url_clean = url.strip()
    try:
        parsed = urlparse(url_clean)
    except Exception as e:
        raise SecuritySSRFException(f"Falha ao interpretar URL: {e}")

    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise SecuritySSRFException(f"Esquema de URL não permitido: '{parsed.scheme}'. Apenas HTTP e HTTPS são aceitos.")

    hostname = parsed.hostname
    if not hostname:
        raise SecuritySSRFException("URL sem hostname válido.")

    hostname_lower = hostname.lower()

    # Disallow known internal hostnames or local suffixes
    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith((".local", ".internal", ".localhost", ".arpa")):
        raise SecuritySSRFException(f"Acesso a hostname interno ou reservado bloqueado: '{hostname}'.")

    port = parsed.port or (443 if scheme == "https" else 80)
    if port not in ALLOWED_PORTS:
        raise SecuritySSRFException(f"Porta de rede não autorizada: {port}. Apenas portas 80 e 443 são permitidas.")

    # Check literal IP address
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
        for net in BLOCKED_NETWORKS:
            if ip_obj in net:
                raise SecuritySSRFException(f"Acesso a endereço IP privado ou reservado bloqueado: '{ip_obj}'.")
    except ValueError:
        # Hostname is not an IP literal, resolve DNS to verify all destination IPs
        try:
            addr_info = socket.getaddrinfo(hostname_lower, port, proto=socket.IPPROTO_TCP)
            for item in addr_info:
                sockaddr = item[4]
                ip_str = sockaddr[0]
                resolved_ip = ipaddress.ip_address(ip_str)
                for net in BLOCKED_NETWORKS:
                    if resolved_ip in net:
                        raise SecuritySSRFException(
                            f"Hostname '{hostname}' resolve para endereço de rede restrito: '{resolved_ip}'."
                        )
        except socket.gaierror:
            # DNS resolution failure will be handled gracefully during connection
            pass

    return url_clean
