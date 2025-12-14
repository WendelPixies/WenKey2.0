-- Adicionar coluna user_id à tabela key_results
ALTER TABLE public.key_results 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Copiar dados de created_by para user_id para os registros existentes
UPDATE public.key_results 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Tornar user_id obrigatório
ALTER TABLE public.key_results 
ALTER COLUMN user_id SET NOT NULL;

-- Atualizar RLS policies para usar user_id

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can create key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Users can update key results in their companies" ON public.key_results;
DROP POLICY IF EXISTS "Users can view key results in their companies" ON public.key_results;

-- Criar policies atualizadas
CREATE POLICY "Users can create their own key results" 
ON public.key_results 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND is_company_member_check(auth.uid(), company_id)
);

CREATE POLICY "Users can update their own key results" 
ON public.key_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view key results of their companies" 
ON public.key_results 
FOR SELECT 
USING (is_company_member_check(auth.uid(), company_id));