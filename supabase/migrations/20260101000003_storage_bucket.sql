-- Bucket privado usado para capas de projeto e avatares (acesso via URL assinada).
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', false)
on conflict (id) do nothing;
