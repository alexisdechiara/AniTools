/**
 * Fonction utilitaire pour convertir une valeur en chaîne de caractères de manière sûre
 * @param value La valeur à convertir
 * @returns Une chaîne de caractères
 */
export function safeString(value: unknown): string {
  return value != null ? String(value) : '';
}

/**
 * Fonction utilitaire pour obtenir une propriété d'un objet de manière sûre
 * @param obj L'objet source
 * @param key La clé de la propriété
 * @returns La valeur de la propriété ou une chaîne vide si non définie
 */
export function safeGetString<T extends object>(
  obj: T,
  key: keyof T
): string {
  const value = obj[key];
  return value != null ? String(value) : '';
}
