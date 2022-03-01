export interface Service {
  init: () => Promise<Service>
}
