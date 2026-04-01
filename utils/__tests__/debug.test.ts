import { renderHook, act } from "@testing-library/react-native";
import { useDebug } from "../debug";

(global as any).__DEV__ = true;

describe("useDebug hook", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
  });

  it("should start with empty lines", () => {
    const { result } = renderHook(() => useDebug());
    expect(result.current.lines).toEqual([]);
  });

  it("should push strings correctly", () => {
    const { result } = renderHook(() => useDebug());
    act(() => {
      result.current.push("Hello", "World");
    });
    expect(result.current.lines).toEqual(["Hello World"]);
  });

  it("should stringify objects", () => {
    const { result } = renderHook(() => useDebug());
    act(() => {
      result.current.push({ a: 1 });
    });
    expect(result.current.lines).toEqual(['{"a":1}']);
  });

  it("should limit lines to 16 (last 15 + new)", () => {
    const { result } = renderHook(() => useDebug());
    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.push(String(i));
      }
    });
    expect(result.current.lines.length).toBe(16);
    expect(result.current.lines[result.current.lines.length - 1]).toBe("19");
  });
});
