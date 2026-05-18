import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import * as React from "react";
import { renderToString } from "react-dom/server";

import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);

function renderSidebarShell() {
  return renderToString(
    React.createElement(
      SidebarProvider,
      null,
      React.createElement(
        Sidebar,
        { collapsible: "icon" },
        React.createElement("div", null, "Navigation"),
      ),
      React.createElement(
        SidebarInset,
        null,
        React.createElement("div", null, "Content"),
      ),
    ),
  );
}

function setMobileWindow() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      innerWidth: 390,
      matchMedia: () => ({
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    },
  });
}

afterEach(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, "window");
});

describe("sidebar hydration structure", () => {
  test("renders the same initial shell structure before browser effects run", () => {
    const serverHtml = renderSidebarShell();

    setMobileWindow();

    const clientInitialHtml = renderSidebarShell();

    assert.equal(clientInitialHtml, serverHtml);
    assert.match(serverHtml, /data-slot="sidebar"/);
    assert.match(serverHtml, /data-slot="sidebar-inset"/);
    assert.ok(
      serverHtml.indexOf('data-slot="sidebar"') <
        serverHtml.indexOf('data-slot="sidebar-inset"'),
    );
  });
});
