CREATE TABLE IF NOT EXISTS public.tasks (
    -- 1. Identity & Ownership
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    
    todos JSONB NOT NULL DEFAULT '[]'::jsonb, 
    
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'submitted', 'given_up')),
    
    registered_duration_min INT NOT NULL CHECK (registered_duration_min > 0),
    actual_duration_sec INT DEFAULT 0 CHECK (actual_duration_sec >= 0),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT task_must_have_todos CHECK (jsonb_array_length(todos) > 0)
);

-- Task Notes (1-n relationship) — Audit trail for notes during task execution
CREATE TABLE IF NOT EXISTS public.task_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT task_note_must_have_content CHECK (char_length(trim(content)) > 0)
);

-- Indexes for task_notes queries
CREATE INDEX idx_task_notes_task_id ON public.task_notes(task_id DESC);
CREATE INDEX idx_task_notes_user_id ON public.task_notes(user_id, created_at DESC);