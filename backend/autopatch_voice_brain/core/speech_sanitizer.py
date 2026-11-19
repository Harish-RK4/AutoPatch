"""
Speech Sanitizer for AutoPatch Voice Agent.
Converts raw code syntax errors, stack traces, and patch diffs into
fluent, natural spoken English suitable for phone calls.
"""

from __future__ import annotations

import re


def sanitize_code_for_speech(text: str) -> str:
    """
    Cleans up raw code, diffs, and compiler outputs so they sound natural when spoken
    over a telephone line, preventing XML formatting crashes and robotic spelling out of symbols.
    """
    if not text:
        return ""

    s = text

    # Strip code block wrappers
    s = re.sub(r"```[a-zA-Z]*\n?", "", s)
    s = s.replace("```", "")
    s = s.replace("`", "")

    # Common exception names into conversational speech
    translations = {
        "SyntaxError: invalid syntax": "a syntax error in the code structure",
        "SyntaxError: unexpected EOF while parsing": "a syntax error from an unclosed bracket or block",
        "IndentationError": "an indentation formatting error",
        "NameError": "an undefined variable error",
        "TypeError": "a data type mismatch error",
        "ValueError": "an invalid value error",
        "KeyError": "a missing dictionary key error",
        "IndexError": "an index out of range error",
        "AttributeError": "an invalid attribute error",
        "ZeroDivisionError": "a division by zero error",
        "NullPointerException": "a null pointer error",
        "NullReferenceException": "a null reference error",
        "ImportError": "a missing package or module import error",
        "ModuleNotFoundError": "a missing module import error",
        "MemoryError": "an out of memory error",
        "TimeoutError": "a request timeout error",
        "DataFrame": "data frame",
        "df.": "the dataset ",
        "NaN": "missing null value",
        "null": "null",
        "None": "none",
        "==": " equals ",
        "!=": " is not equal to ",
        "&&": " and ",
        "||": " or ",
        "->": " returns ",
        "=>": " points to ",
        ":=": " assigned to ",
    }

    for key, val in translations.items():
        s = s.replace(key, val)

    # Convert line number references (e.g., "line 42" or "L42") into clear spoken terms
    s = re.sub(r"\bL([0-9]+)\b", r"line \1", s)

    # Replace XML and special characters that break TwiML or sound robotic
    s = (
        s.replace("&", " and ")
        .replace("<", " ")
        .replace(">", " ")
        .replace('"', "'")
        .replace("*", "")
        .replace("#", "")
        .replace("_", " ")
        .replace("~", " ")
        .replace("{", " ")
        .replace("}", " ")
        .replace("[", " ")
        .replace("]", " ")
        .replace("\\", " ")
        .replace("/", " ")
        .replace("\u2011", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", "'")
        .replace("\u201d", "'")
    )

    # Collapse multiple whitespaces
    s = re.sub(r"\s+", " ", s).strip()
    return s
