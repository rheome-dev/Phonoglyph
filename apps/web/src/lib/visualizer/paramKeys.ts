export const PARAM_DELIMITER = '::'

// Build a stable parameter key from an effect instance id and param name
export function makeParamKey(effectInstanceId: string, paramName: string): string {
  return `${effectInstanceId}${PARAM_DELIMITER}${paramName}`
}

// Parse a parameter key back into its parts
export function parseParamKey(key: string): { effectInstanceId: string; paramName: string } | null {
  const idx = key.indexOf(PARAM_DELIMITER)
  if (idx === -1) return null
  const effectInstanceId = key.slice(0, idx)
  const paramName = key.slice(idx + PARAM_DELIMITER.length)
  if (!effectInstanceId || !paramName) return null
  return { effectInstanceId, paramName }
}

// Helpers for nested param maps: Record<effectInstanceId, Record<paramName, number>>
export function getNestedParam(
  map: Record<string, Record<string, any>>,
  effectInstanceId: string,
  paramName: string
): any {
  return map[effectInstanceId]?.[paramName]
}

export function setNestedParam(
  map: Record<string, Record<string, any>>,
  effectInstanceId: string,
  paramName: string,
  value: any
): Record<string, Record<string, any>> {
  const prev = map[effectInstanceId] || {}
  return {
    ...map,
    [effectInstanceId]: {
      ...prev,
      [paramName]: value,
    },
  }
}

