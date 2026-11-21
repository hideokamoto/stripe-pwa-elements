export {};

declare global {
  // Keep existing `jest.Mocked` / `jest.Mock` annotations compiling after the Vitest switch.
  namespace jest {
    type Mocked<T> = import('vitest').Mocked<T>;
    type Mock<T extends (...args: any) => any = (...args: any) => any> = import('vitest').Mock<T>;
  }
}
