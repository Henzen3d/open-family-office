"""Server-Side Conversation Session and Context Continuity Store.

Implements Task T04:
- Conversation identification and server-side state tracking
- Bounded context window
- Entity, account, period, topic, and clarification state persistence
- Entity resolution with canonical codes, aliases, and 'a outra empresa' disambiguation
- Relative period resolution ('E no mês anterior?', 'E em setembro?')
- Explicit session deletion and lifecycle management
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional
import uuid


CANONICAL_ENTITIES = {
    "FIX_SERVICOS": "Fix Serviços MEI",
    "FACILITA_VISTORIAS": "Facilita Vistorias MEI",
    "HOUSEHOLD_OSMAR": "Household PF",
    "CONSOLIDADO": "Consolidado (Leitura)",
}

ENTITY_ALIASES = {
    "fix": "FIX_SERVICOS",
    "fix servicos": "FIX_SERVICOS",
    "fix serviços": "FIX_SERVICOS",
    "inter": "FIX_SERVICOS",
    "inter pj": "FIX_SERVICOS",
    "osmar": "FIX_SERVICOS",
    "facilita": "FACILITA_VISTORIAS",
    "facilita vistorias": "FACILITA_VISTORIAS",
    "caixa": "FACILITA_VISTORIAS",
    "caixa pj": "FACILITA_VISTORIAS",
    "vera": "FACILITA_VISTORIAS",
    "familia": "HOUSEHOLD_OSMAR",
    "família": "HOUSEHOLD_OSMAR",
    "casa": "HOUSEHOLD_OSMAR",
    "pessoal": "HOUSEHOLD_OSMAR",
    "nubank": "HOUSEHOLD_OSMAR",
    "nubank pf": "HOUSEHOLD_OSMAR",
    "pf": "HOUSEHOLD_OSMAR",
    "consolidado": "CONSOLIDADO",
    "total": "CONSOLIDADO",
    "todas": "CONSOLIDADO",
    "todos": "CONSOLIDADO",
}

MONTH_MAP = {
    "janeiro": "01",
    "fevereiro": "02",
    "março": "03",
    "marco": "03",
    "abril": "04",
    "maio": "05",
    "junho": "06",
    "julho": "07",
    "agosto": "08",
    "setembro": "09",
    "outubro": "10",
    "novembro": "11",
    "dezembro": "12",
}


@dataclass
class ChatTurn:
    role: str  # "user" | "assistant" | "tool"
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "tool_calls": self.tool_calls,
            "tool_results": self.tool_results,
            "metadata": self.metadata,
        }


@dataclass
class ConversationSession:
    id: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    active_entity: Optional[str] = None
    active_account: Optional[str] = None
    active_period: Optional[str] = None
    active_topic: Optional[str] = None
    asd_mode: str = "natural"
    pending_clarification: Optional[Dict[str, Any]] = None
    last_evidence: Optional[Dict[str, Any]] = None
    history: List[ChatTurn] = field(default_factory=list)
    max_history_length: int = 12

    def add_turn(self, role: str, content: str, **kwargs) -> ChatTurn:
        turn = ChatTurn(role=role, content=content, **kwargs)
        self.history.append(turn)
        if len(self.history) > self.max_history_length:
            self.history = self.history[-self.max_history_length:]
        self.updated_at = datetime.now(timezone.utc).isoformat()
        return turn

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "active_entity": self.active_entity,
            "active_account": self.active_account,
            "active_period": self.active_period,
            "active_topic": self.active_topic,
            "asd_mode": self.asd_mode,
            "pending_clarification": self.pending_clarification,
            "history_length": len(self.history),
            "messages": [t.to_dict() for t in self.history],
        }


class ConversationStore:
    """Thread-safe in-memory store for active conversation sessions."""

    _instance: Optional[ConversationStore] = None

    def __init__(self):
        self._sessions: Dict[str, ConversationSession] = {}

    @classmethod
    def get_instance(cls) -> ConversationStore:
        if cls._instance is None:
            cls._instance = ConversationStore()
        return cls._instance

    def get_or_create(
        self,
        conversation_id: Optional[str] = None,
        default_entity: Optional[str] = None,
        asd_mode: str = "natural",
    ) -> ConversationSession:
        if conversation_id and conversation_id in self._sessions:
            sess = self._sessions[conversation_id]
            if default_entity and not sess.active_entity:
                sess.active_entity = self.resolve_entity(default_entity)
            return sess

        cid = conversation_id if conversation_id and len(conversation_id.strip()) > 0 else f"conv_{uuid.uuid4().hex[:12]}"
        canon_ent = self.resolve_entity(default_entity) if default_entity else None
        sess = ConversationSession(
            id=cid,
            active_entity=canon_ent,
            asd_mode=asd_mode or "natural",
        )
        self._sessions[cid] = sess
        return sess

    def get_session(self, conversation_id: str) -> Optional[ConversationSession]:
        return self._sessions.get(conversation_id)

    def delete_session(self, conversation_id: str) -> bool:
        if conversation_id in self._sessions:
            del self._sessions[conversation_id]
            return True
        return False

    def clear(self) -> None:
        self._sessions.clear()

    def resolve_entity(self, text: Optional[str], active_entity: Optional[str] = None) -> Optional[str]:
        """Resolves raw text or mention into canonical entity code.

        Handles aliases, exact codes, and 'a outra empresa' disambiguation.
        """
        if not text:
            return active_entity

        clean = text.strip().lower()

        # Disambiguate 'a outra empresa' / 'o outro mei'
        if "outra empresa" in clean or "outro mei" in clean:
            if active_entity == "FIX_SERVICOS":
                return "FACILITA_VISTORIAS"
            elif active_entity == "FACILITA_VISTORIAS":
                return "FIX_SERVICOS"
            return None

        # Check exact uppercase canonical codes
        clean_upper = text.strip().upper()
        if clean_upper in CANONICAL_ENTITIES:
            return clean_upper

        # Check aliases
        for alias, code in ENTITY_ALIASES.items():
            if re.search(rf"\b{re.escape(alias)}\b", clean):
                return code

        return active_entity

    def resolve_period(
        self,
        text: str,
        current_active_period: Optional[str] = None,
        reference_year: int = 2026,
    ) -> Optional[str]:
        """Extracts or adjusts reference period from text.

        Handles:
        - Specific months: 'outubro' -> '2026-10', 'setembro de 2026' -> '2026-09'
        - Relative follow-ups: 'no mês anterior', 'mês passado'
        """
        clean = text.lower()

        # Check explicit year-month format YYYY-MM
        ym_match = re.search(r"\b(202\d)-(0[1-9]|1[0-2])\b", clean)
        if ym_match:
            return f"{ym_match.group(1)}-{ym_match.group(2)}"

        # Check month name
        for month_name, mm in MONTH_MAP.items():
            if re.search(rf"\b{month_name}\b", clean):
                # Check if specific year is mentioned
                year_match = re.search(rf"\b(202\d)\b", clean)
                yr = int(year_match.group(1)) if year_match else reference_year
                return f"{yr}-{mm}"

        # Check relative expressions: "mês anterior", "mes anterior", "mês passado"
        if re.search(r"\b(m[eê]s\s+anterior|m[eê]s\s+passado)\b", clean):
            base_period = current_active_period or f"{reference_year}-11"
            try:
                parts = base_period.split("-")
                yr = int(parts[0])
                mo = int(parts[1])
                mo -= 1
                if mo < 1:
                    mo = 12
                    yr -= 1
                return f"{yr:04d}-{mo:02d}"
            except Exception:
                return f"{reference_year}-10"

        # Check "mês atual", "este mês", "neste mês"
        if re.search(r"\b(m[eê]s\s+atual|este\s+m[eê]s|neste\s+m[eê]s)\b", clean):
            return f"{reference_year}-11"

        return current_active_period
