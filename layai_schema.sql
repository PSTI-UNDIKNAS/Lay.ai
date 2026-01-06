--
-- PostgreSQL database dump
--

\restrict Viq5CBiEchb7zUNAhOClgeyJV6GbGwZ7nxgHfrUakkHdNfTxXKKQMdGcEhwjTFr

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-10 22:30:59 CST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 24665)
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- TOC entry 3835 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- TOC entry 986 (class 1247 OID 16474)
-- Name: access_type; Type: TYPE; Schema: public; Owner: layai_user
--

CREATE TYPE public.access_type AS ENUM (
    'public',
    'password',
    'by_request'
);


ALTER TYPE public.access_type OWNER TO layai_user;

--
-- TOC entry 989 (class 1247 OID 16482)
-- Name: enrollment_status; Type: TYPE; Schema: public; Owner: layai_user
--

CREATE TYPE public.enrollment_status AS ENUM (
    'enrolled',
    'pending_approval',
    'denied'
);


ALTER TYPE public.enrollment_status OWNER TO layai_user;

--
-- TOC entry 977 (class 1247 OID 16433)
-- Name: user_role; Type: TYPE; Schema: public; Owner: layai_user
--

CREATE TYPE public.user_role AS ENUM (
    'student',
    'lecturer',
    'admin'
);


ALTER TYPE public.user_role OWNER TO layai_user;

--
-- TOC entry 980 (class 1247 OID 16440)
-- Name: user_status; Type: TYPE; Schema: public; Owner: layai_user
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'pending_approval',
    'inactive'
);


ALTER TYPE public.user_status OWNER TO layai_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 16600)
-- Name: assignments; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    learning_unit_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assignments OWNER TO layai_user;

--
-- TOC entry 220 (class 1259 OID 16489)
-- Name: courses; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    access_type public.access_type DEFAULT 'public'::public.access_type NOT NULL,
    password_hash character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.courses OWNER TO layai_user;

--
-- TOC entry 231 (class 1259 OID 24997)
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.document_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    course_id uuid,
    learning_unit_id uuid,
    content text NOT NULL,
    embedding public.vector(768)
);


ALTER TABLE public.document_chunks OWNER TO layai_user;

--
-- TOC entry 225 (class 1259 OID 16585)
-- Name: documents; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    learning_unit_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO layai_user;

--
-- TOC entry 221 (class 1259 OID 16505)
-- Name: enrollments; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    status public.enrollment_status DEFAULT 'pending_approval'::public.enrollment_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.enrollments OWNER TO layai_user;

--
-- TOC entry 229 (class 1259 OID 16652)
-- Name: flashcard_sets; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.flashcard_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    learning_unit_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.flashcard_sets OWNER TO layai_user;

--
-- TOC entry 230 (class 1259 OID 16665)
-- Name: flashcards; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.flashcards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid NOT NULL,
    front_text text NOT NULL,
    back_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.flashcards OWNER TO layai_user;

--
-- TOC entry 222 (class 1259 OID 16526)
-- Name: learning_units; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.learning_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    unit_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.learning_units OWNER TO layai_user;

--
-- TOC entry 228 (class 1259 OID 16637)
-- Name: quizzes; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    learning_unit_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    quiz_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quizzes OWNER TO layai_user;

--
-- TOC entry 218 (class 1259 OID 16389)
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.schema_migrations (
    version bigint NOT NULL,
    dirty boolean NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO layai_user;

--
-- TOC entry 223 (class 1259 OID 16541)
-- Name: student_progress; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.student_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    current_learning_unit_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_progress OWNER TO layai_user;

--
-- TOC entry 227 (class 1259 OID 16615)
-- Name: submissions; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    file_path character varying(500),
    grade character varying(10),
    feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.submissions OWNER TO layai_user;

--
-- TOC entry 224 (class 1259 OID 16566)
-- Name: unit_completions; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.unit_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    learning_unit_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.unit_completions OWNER TO layai_user;

--
-- TOC entry 219 (class 1259 OID 16445)
-- Name: users; Type: TABLE; Schema: public; Owner: layai_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    unique_identifier character varying(255),
    password_hash character varying(255),
    role public.user_role NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO layai_user;

--
-- TOC entry 3648 (class 2606 OID 16609)
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 3620 (class 2606 OID 16499)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 3667 (class 2606 OID 25004)
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- TOC entry 3645 (class 2606 OID 16594)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3623 (class 2606 OID 16513)
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- TOC entry 3625 (class 2606 OID 16515)
-- Name: enrollments enrollments_student_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_course_id_key UNIQUE (student_id, course_id);


--
-- TOC entry 3660 (class 2606 OID 16659)
-- Name: flashcard_sets flashcard_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.flashcard_sets
    ADD CONSTRAINT flashcard_sets_pkey PRIMARY KEY (id);


--
-- TOC entry 3663 (class 2606 OID 16674)
-- Name: flashcards flashcards_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);


--
-- TOC entry 3631 (class 2606 OID 16535)
-- Name: learning_units learning_units_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.learning_units
    ADD CONSTRAINT learning_units_pkey PRIMARY KEY (id);


--
-- TOC entry 3658 (class 2606 OID 16646)
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- TOC entry 3612 (class 2606 OID 16393)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 3635 (class 2606 OID 16548)
-- Name: student_progress student_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 16550)
-- Name: student_progress student_progress_student_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_student_id_course_id_key UNIQUE (student_id, course_id);


--
-- TOC entry 3653 (class 2606 OID 16626)
-- Name: submissions submissions_assignment_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assignment_id_student_id_key UNIQUE (assignment_id, student_id);


--
-- TOC entry 3655 (class 2606 OID 16624)
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3641 (class 2606 OID 16572)
-- Name: unit_completions unit_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.unit_completions
    ADD CONSTRAINT unit_completions_pkey PRIMARY KEY (id);


--
-- TOC entry 3643 (class 2606 OID 16574)
-- Name: unit_completions unit_completions_student_id_learning_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.unit_completions
    ADD CONSTRAINT unit_completions_student_id_learning_unit_id_key UNIQUE (student_id, learning_unit_id);


--
-- TOC entry 3614 (class 2606 OID 16457)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3616 (class 2606 OID 16459)
-- Name: users users_nim_key; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_nim_key UNIQUE (unique_identifier);


--
-- TOC entry 3618 (class 2606 OID 16455)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3665 (class 1259 OID 25010)
-- Name: document_chunks_embedding_idx; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops);


--
-- TOC entry 3649 (class 1259 OID 16690)
-- Name: idx_assignments_learning_unit_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_assignments_learning_unit_id ON public.assignments USING btree (learning_unit_id);


--
-- TOC entry 3621 (class 1259 OID 16680)
-- Name: idx_courses_creator_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_courses_creator_id ON public.courses USING btree (creator_id);


--
-- TOC entry 3646 (class 1259 OID 16689)
-- Name: idx_documents_learning_unit_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_documents_learning_unit_id ON public.documents USING btree (learning_unit_id);


--
-- TOC entry 3626 (class 1259 OID 16682)
-- Name: idx_enrollments_course_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_enrollments_course_id ON public.enrollments USING btree (course_id);


--
-- TOC entry 3627 (class 1259 OID 16681)
-- Name: idx_enrollments_student_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_enrollments_student_id ON public.enrollments USING btree (student_id);


--
-- TOC entry 3661 (class 1259 OID 16694)
-- Name: idx_flashcard_sets_learning_unit_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_flashcard_sets_learning_unit_id ON public.flashcard_sets USING btree (learning_unit_id);


--
-- TOC entry 3664 (class 1259 OID 16695)
-- Name: idx_flashcards_set_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_flashcards_set_id ON public.flashcards USING btree (set_id);


--
-- TOC entry 3628 (class 1259 OID 16683)
-- Name: idx_learning_units_course_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_learning_units_course_id ON public.learning_units USING btree (course_id);


--
-- TOC entry 3629 (class 1259 OID 16684)
-- Name: idx_learning_units_order; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_learning_units_order ON public.learning_units USING btree (course_id, unit_order);


--
-- TOC entry 3656 (class 1259 OID 16693)
-- Name: idx_quizzes_learning_unit_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_quizzes_learning_unit_id ON public.quizzes USING btree (learning_unit_id);


--
-- TOC entry 3632 (class 1259 OID 16686)
-- Name: idx_student_progress_course_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_student_progress_course_id ON public.student_progress USING btree (course_id);


--
-- TOC entry 3633 (class 1259 OID 16685)
-- Name: idx_student_progress_student_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_student_progress_student_id ON public.student_progress USING btree (student_id);


--
-- TOC entry 3650 (class 1259 OID 16691)
-- Name: idx_submissions_assignment_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_submissions_assignment_id ON public.submissions USING btree (assignment_id);


--
-- TOC entry 3651 (class 1259 OID 16692)
-- Name: idx_submissions_student_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_submissions_student_id ON public.submissions USING btree (student_id);


--
-- TOC entry 3638 (class 1259 OID 16688)
-- Name: idx_unit_completions_learning_unit_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_unit_completions_learning_unit_id ON public.unit_completions USING btree (learning_unit_id);


--
-- TOC entry 3639 (class 1259 OID 16687)
-- Name: idx_unit_completions_student_id; Type: INDEX; Schema: public; Owner: layai_user
--

CREATE INDEX idx_unit_completions_student_id ON public.unit_completions USING btree (student_id);


--
-- TOC entry 3678 (class 2606 OID 16610)
-- Name: assignments assignments_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_learning_unit_id_fkey FOREIGN KEY (learning_unit_id) REFERENCES public.learning_units(id) ON DELETE CASCADE;


--
-- TOC entry 3668 (class 2606 OID 16500)
-- Name: courses courses_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3684 (class 2606 OID 25005)
-- Name: document_chunks document_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 3677 (class 2606 OID 16595)
-- Name: documents documents_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_learning_unit_id_fkey FOREIGN KEY (learning_unit_id) REFERENCES public.learning_units(id) ON DELETE CASCADE;


--
-- TOC entry 3669 (class 2606 OID 16521)
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 3670 (class 2606 OID 16516)
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3682 (class 2606 OID 16660)
-- Name: flashcard_sets flashcard_sets_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.flashcard_sets
    ADD CONSTRAINT flashcard_sets_learning_unit_id_fkey FOREIGN KEY (learning_unit_id) REFERENCES public.learning_units(id) ON DELETE CASCADE;


--
-- TOC entry 3683 (class 2606 OID 16675)
-- Name: flashcards flashcards_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;


--
-- TOC entry 3671 (class 2606 OID 16536)
-- Name: learning_units learning_units_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.learning_units
    ADD CONSTRAINT learning_units_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 3681 (class 2606 OID 16647)
-- Name: quizzes quizzes_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_learning_unit_id_fkey FOREIGN KEY (learning_unit_id) REFERENCES public.learning_units(id) ON DELETE CASCADE;


--
-- TOC entry 3672 (class 2606 OID 16556)
-- Name: student_progress student_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 3673 (class 2606 OID 16561)
-- Name: student_progress student_progress_current_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_current_learning_unit_id_fkey FOREIGN KEY (current_learning_unit_id) REFERENCES public.learning_units(id) ON DELETE SET NULL;


--
-- TOC entry 3674 (class 2606 OID 16551)
-- Name: student_progress student_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3679 (class 2606 OID 16627)
-- Name: submissions submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- TOC entry 3680 (class 2606 OID 16632)
-- Name: submissions submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 3675 (class 2606 OID 16580)
-- Name: unit_completions unit_completions_learning_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.unit_completions
    ADD CONSTRAINT unit_completions_learning_unit_id_fkey FOREIGN KEY (learning_unit_id) REFERENCES public.learning_units(id) ON DELETE CASCADE;


--
-- TOC entry 3676 (class 2606 OID 16575)
-- Name: unit_completions unit_completions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: layai_user
--

ALTER TABLE ONLY public.unit_completions
    ADD CONSTRAINT unit_completions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2025-11-10 22:31:00 CST

--
-- PostgreSQL database dump complete
--

\unrestrict Viq5CBiEchb7zUNAhOClgeyJV6GbGwZ7nxgHfrUakkHdNfTxXKKQMdGcEhwjTFr

