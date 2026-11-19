"""
AutoPatch Security Package
"""

from app.security.scanner import (
    CWE_MAP,
    SecurityScanner,
    VulnerabilityAdvisory,
    get_cwe_owasp_tag,
    parse_requirements_txt,
    security_scanner,
)

__all__ = [
    "CWE_MAP",
    "SecurityScanner",
    "VulnerabilityAdvisory",
    "get_cwe_owasp_tag",
    "parse_requirements_txt",
    "security_scanner",
]
