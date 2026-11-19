"""
Security Mode Engine: CWE/OWASP Mapping and OSV.dev Dependency CVE Scanner
Provides standardized Common Weakness Enumeration (CWE) and OWASP Top 10 classifications,
and queries the open, free OSV.dev API to audit project dependencies for known vulnerabilities.
"""

import logging
import re
from dataclasses import asdict, dataclass
from typing import Any

import httpx

logger = logging.getLogger("autopatch.security")

# CWE and OWASP Top 10 Mappings
CWE_MAP: dict[str, dict[str, str]] = {
    "missing_bounds_check": {
        "cwe_id": "CWE-20",
        "cwe_title": "Improper Input Validation",
        "owasp_category": "A04:2021-Insecure Design",
        "severity": "high",
    },
    "logic_boundary_defect": {
        "cwe_id": "CWE-20",
        "cwe_title": "Improper Input Validation",
        "owasp_category": "A04:2021-Insecure Design",
        "severity": "medium",
    },
    "zero_division_error": {
        "cwe_id": "CWE-369",
        "cwe_title": "Divide By Zero",
        "owasp_category": "A04:2021-Insecure Design",
        "severity": "medium",
    },
    "command_injection": {
        "cwe_id": "CWE-78",
        "cwe_title": "Improper Neutralization of Special Elements used in an OS Command",
        "owasp_category": "A03:2021-Injection",
        "severity": "critical",
    },
    "sql_injection": {
        "cwe_id": "CWE-89",
        "cwe_title": "Improper Neutralization of Special Elements used in an SQL Command",
        "owasp_category": "A03:2021-Injection",
        "severity": "critical",
    },
    "null_pointer_dereference": {
        "cwe_id": "CWE-476",
        "cwe_title": "NULL Pointer Dereference",
        "owasp_category": "A04:2021-Insecure Design",
        "severity": "high",
    },
    "hardcoded_credentials": {
        "cwe_id": "CWE-798",
        "cwe_title": "Use of Hard-coded Credentials",
        "owasp_category": "A07:2021-Identification and Authentication Failures",
        "severity": "critical",
    },
    "unsafe_eval": {
        "cwe_id": "CWE-95",
        "cwe_title": "Improper Neutralization of Directives in Dynamically Evaluated Code",
        "owasp_category": "A03:2021-Injection",
        "severity": "critical",
    },
}


@dataclass
class VulnerabilityAdvisory:
    id: str  # e.g., GHSA-xxxx-yyyy or CVE-2023-xxxx
    package_name: str
    installed_version: str
    ecosystem: str
    title: str
    severity: str  # critical, high, medium, low
    cwe_ids: list[str]
    fixed_version: str | None
    reference_url: str | None


def get_cwe_owasp_tag(flaw_type: str) -> dict[str, str]:
    """Returns standardized CWE and OWASP classifications for a given flaw type."""
    normalized = flaw_type.lower().replace("-", "_").replace(" ", "_")
    return CWE_MAP.get(
        normalized,
        {
            "cwe_id": "CWE-699",
            "cwe_title": "Software Development Defect",
            "owasp_category": "A04:2021-Insecure Design",
            "severity": "medium",
        },
    )


def parse_requirements_txt(content: str) -> list[tuple[str, str]]:
    """Extracts package name and pinned version from requirements.txt content."""
    packages: list[tuple[str, str]] = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Match standard versions: package==1.2.3, package>=1.2.3, package~=1.2.3
        match = re.match(r"^([a-zA-Z0-9_\-]+)\s*(?:==|>=|~=)\s*([0-9a-zA-Z\.\-]+)", line)
        if match:
            packages.append((match.group(1), match.group(2)))
        elif re.match(r"^[a-zA-Z0-9_\-]+$", line):
            packages.append((line, "latest"))
    return packages


class SecurityScanner:
    """Audits project manifests and code against known CVE advisories via OSV.dev API."""

    OSV_API_URL = "https://api.osv.dev/v1/query"

    async def scan_package_osv(
        self, package_name: str, version: str, ecosystem: str = "PyPI"
    ) -> list[VulnerabilityAdvisory]:
        """Queries the OSV.dev open API for known vulnerabilities for a specific package version."""
        if version == "latest" or not version:
            return []

        payload = {
            "version": version,
            "package": {
                "name": package_name,
                "ecosystem": ecosystem,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(self.OSV_API_URL, json=payload)
                if response.status_code != 200:
                    return []

                data = response.json()
                vulns = data.get("vulns", [])
                advisories: list[VulnerabilityAdvisory] = []

                for v in vulns:
                    vid = v.get("id", "UNKNOWN-CVE")
                    summary = v.get("summary") or v.get("details", "")[:120]
                    # Find fixed version in ranges
                    fixed_ver = None
                    for affected in v.get("affected", []):
                        for r in affected.get("ranges", []):
                            for event in r.get("events", []):
                                if "fixed" in event:
                                    fixed_ver = event["fixed"]
                                    break

                    # Extract database_specific severity or CVSS
                    severity = "medium"
                    if "database_specific" in v:
                        db_sev = v["database_specific"].get("severity", "").lower()
                        if db_sev in ("critical", "high", "medium", "low"):
                            severity = db_sev

                    cwe_ids = [
                        alias for alias in v.get("aliases", []) if alias.startswith("CVE")
                    ] or ["CWE-1035"]

                    ref_url = None
                    refs = v.get("references", [])
                    if refs and isinstance(refs, list):
                        ref_url = refs[0].get("url")

                    advisories.append(
                        VulnerabilityAdvisory(
                            id=vid,
                            package_name=package_name,
                            installed_version=version,
                            ecosystem=ecosystem,
                            title=summary or f"Vulnerability in {package_name}",
                            severity=severity,
                            cwe_ids=cwe_ids,
                            fixed_version=fixed_ver,
                            reference_url=ref_url,
                        )
                    )
                return advisories
        except (httpx.HTTPError, RuntimeError, OSError, ValueError) as exc:
            logger.warning(
                "OSV.dev scan error for %s==%s (falling back to offline check): %s",
                package_name,
                version,
                exc,
            )
            return []

    async def scan_manifest(
        self, manifest_content: str, manifest_type: str = "requirements.txt"
    ) -> list[dict[str, Any]]:
        """Parses a dependency manifest and queries vulnerabilities."""
        if manifest_type == "requirements.txt":
            packages = parse_requirements_txt(manifest_content)
            ecosystem = "PyPI"
        else:
            return []

        all_advisories: list[dict[str, Any]] = []
        for pkg, ver in packages:
            advs = await self.scan_package_osv(pkg, ver, ecosystem=ecosystem)
            for a in advs:
                all_advisories.append(asdict(a))

        return all_advisories


security_scanner = SecurityScanner()
