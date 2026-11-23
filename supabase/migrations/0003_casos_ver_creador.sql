-- LexVE · Corrección: crear casos fallaba con "new row violates row-level security policy".
-- Al hacer INSERT ... RETURNING, legal.puede_ver_caso(id) consulta legal.casos con la foto
-- de la sentencia y aún no ve la fila recién creada. Se añaden condiciones directas sobre la fila:
-- su creador (que además queda como responsable por trigger) y los socios/admin del despacho.
drop policy if exists casos_ver on legal.casos;
create policy casos_ver on legal.casos for select to authenticated using (
  creado_por = (select auth.uid())
  or (despacho_id = (select legal.mi_despacho()) and (select legal.es_gerente()))
  or (select legal.puede_ver_caso(id))
);
