CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'pending_approval');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    nim VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);