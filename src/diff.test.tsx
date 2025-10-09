import {
  createTestRenderer,
  type MockMouse,
  type TestRenderer,
} from "@opentui/core/testing";
import { beforeEach, afterEach } from "bun:test";

let testRenderer: TestRenderer;
let mockMouse: MockMouse;
let renderOnce: () => Promise<void>;

beforeEach(async () => {
  ({
    renderer: testRenderer,
    mockMouse,
    renderOnce,
  } = await createTestRenderer({ width: 80, height: 24 }));
});

afterEach(() => {
  testRenderer.destroy();
});
