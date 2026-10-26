#!/usr/bin/env python3
"""Patch generated .shortcut: name, icon, ExtensionInput on detect.text."""
from __future__ import annotations

import plistlib
import sys
from pathlib import Path

SHORTCUT_NAME = "記帳匯入通知"


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "public/shortcuts/ledger-notification-import.shortcut")
    with path.open("rb") as f:
        doc = plistlib.load(f)

    doc["WFWorkflowName"] = SHORTCUT_NAME
    doc["WFWorkflowMinimumClientVersion"] = 900
    doc["WFWorkflowMinimumClientVersionString"] = "900"
    doc["WFWorkflowIcon"] = {
        "WFWorkflowIconGlyphNumber": 59511,
        "WFWorkflowIconStartColor": 431817727,
    }

    for action in doc.get("WFWorkflowActions") or []:
        if action.get("WFWorkflowActionIdentifier") == "is.workflow.actions.detect.text":
            params = action.setdefault("WFWorkflowActionParameters", {})
            params["WFInput"] = {
                "Value": {"Type": "ExtensionInput"},
                "WFSerializationType": "WFTextTokenAttachment",
            }

    with path.open("wb") as f:
        plistlib.dump(doc, f, fmt=plistlib.FMT_BINARY)

    print(f"Patched {path} (WFWorkflowName={SHORTCUT_NAME})")


if __name__ == "__main__":
    main()
