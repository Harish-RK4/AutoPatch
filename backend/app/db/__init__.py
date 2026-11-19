"""
Database package for AutoPatch
Provides Supabase PostgREST client and fallback repositories.
"""

from app.db.supabase import SupabaseRepository, supabase_repo

__all__ = ["SupabaseRepository", "supabase_repo"]
