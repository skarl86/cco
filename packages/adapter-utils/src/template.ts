export function renderPromptTemplate(
  template: string,
  variables: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
}
