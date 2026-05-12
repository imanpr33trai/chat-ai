export interface ModelInfo {
  id: string
  object?: string
  created?: number
  owned_by?: string
  root?: string
}

export interface ModelsResponse {
  object: string
  data: ModelInfo[]
}
