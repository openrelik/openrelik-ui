/*
Copyright 2025-2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import InvestigationGraphNode from "../InvestigationGraphNode.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationGraphNode.vue", () => {
    const baseProps = {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
    };

    describe("Node Types and Icons", () => {
        const types = [
            { type: "QUESTION", icon: "mdi-help-circle-outline" },
            { type: "SECTION", icon: "mdi-lightbulb-outline", label: "LEAD" },
            { type: "HYPOTHESIS", icon: "mdi-flask-outline" },
            { type: "TASK", icon: "mdi-checkbox-marked-circle-outline" },
            { type: "UNKNOWN", icon: "mdi-circle-outline" },
        ];

        it.each(types)("renders correctly for type $type", ({ type, icon, label }) => {
            const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type, label: "Label", status: null, childCount: 0 }
                }
            });

            expect(wrapper.find(`.${icon}`).exists()).toBe(true);
            if (label) {
                expect(wrapper.text()).toContain(label);
            } else if (type !== "UNKNOWN") {
                expect(wrapper.text()).toContain(type);
            }
        });
    });

    describe("Status Icons and Colors", () => {
        const statuses = [
            { status: "COMPLETED", icon: "mdi-check-circle", color: "success" },
            { status: "PROVEN", icon: "mdi-check-circle", color: "success" },
            { status: "SUPPORTS_PARENT", icon: "mdi-check-circle", color: "success" },
            { status: "FAILED", icon: "mdi-close-circle", color: "error" },
            { status: "DISPROVEN", icon: "mdi-close-circle", color: "error" },
            { status: "REFUTES_PARENT", icon: "mdi-close-circle", color: "error" },
            { status: "IN_PROGRESS", icon: "mdi-play-circle-outline", color: "info" },
            { status: "RUNNING", icon: "mdi-play-circle-outline", color: "info" },
            { status: "DATA_UNAVAILABLE", icon: "mdi-alert-circle-outline", color: "warning" },
            { status: "PENDING", icon: "mdi-clock-outline", color: "grey" }, // Default color grey? No, code says grey default logic inside getStatusColor?
            // Actually PENDING hits "default" in getStatusColor?
            // getStatusColor: switch(status) -> PENDING is NOT listed?
            // Wait, let's check source.
        ];
        
        // PENDING is in getStatusIcon, but NOT in getStatusColor?
        // Source check:
        // getStatusIcon: case "PENDING": return "mdi-clock-outline"
        // getStatusColor: cases COMPLETED...DATA_UNAVAILABLE. default: return "grey".
        // So PENDING returns "grey". Correct.

        it.each(statuses)("renders status $status with icon $icon and color $color", ({ status, icon, color }) => {
            const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "QUESTION", label: "Label", status, childCount: 0 }
                }
            });
            
            // There are two icons: type icon and status icon.
            // Type icon is first. Status icon is second (v-if="node.status").
            
            expect(wrapper.find(`.${icon}`).exists()).toBe(true);
            
            expect(wrapper.html()).toContain(`text-${color}`); 
        });
    });

    describe("Collapsed Indicator", () => {
        it("does NOT show indicator if type is QUESTION", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "QUESTION", label: "Label", status: null, childCount: 5 }
                }
            });
            expect(wrapper.text()).not.toContain("Hypothesis");
             expect(wrapper.text()).not.toContain("Task");
        });
        
        it("does NOT show indicator if childCount is 0", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "SECTION", label: "Label", status: null, childCount: 0 }
                }
            });
            expect(wrapper.text()).not.toContain("Hypotheses");
        });

        it("shows 'Hypothesis' (singular) for SECTION with 1 child", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "SECTION", label: "Label", status: null, childCount: 1 }
                }
            });
            expect(wrapper.text()).toContain("1 Hypothesis");
             expect(wrapper.text()).not.toContain("Hypotheses");
        });

        it("shows 'Hypotheses' (plural) for SECTION with 2 children", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "SECTION", label: "Label", status: null, childCount: 2 }
                }
            });
            expect(wrapper.text()).toContain("2 Hypotheses");
        });

        it("shows 'Task' (singular) for HYPOTHESIS with 1 child", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "HYPOTHESIS", label: "Label", status: null, childCount: 1 }
                }
            });
            expect(wrapper.text()).toContain("1 Task");
            expect(wrapper.text()).not.toContain("Tasks");
        });

         it("shows 'Tasks' (plural) for HYPOTHESIS with 2 children", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: { id: "1", type: "HYPOTHESIS", label: "Label", status: null, childCount: 2 }
                }
            });
            expect(wrapper.text()).toContain("2 Tasks");
        });

        it("shows chevron-right when collapsed", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    isCollapsed: true,
                    node: { id: "1", type: "SECTION", label: "Label", status: null, childCount: 2 }
                }
            });
            expect(wrapper.find(".mdi-chevron-right").exists()).toBe(true);
        });

        it("shows chevron-left when expanded (not collapsed)", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    isCollapsed: false,
                    node: { id: "1", type: "SECTION", label: "Label", status: null, childCount: 2 }
                }
            });
            expect(wrapper.find(".mdi-chevron-left").exists()).toBe(true);
        });
    });

    describe("Styling and Interaction", () => {
        it("applies is-selected class", () => {
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    isSelected: true,
                    node: { id: "1", type: "QUESTION", label: "Label", status: null, childCount: 0 }
                }
            });
            expect(wrapper.find(".investigation-graph-node").classes()).toContain("is-selected");
        });

        it("emits click event with node data", async () => {
             const nodeData = { id: "1", type: "QUESTION", label: "Label", status: null, childCount: 0 };
             const wrapper = mount(InvestigationGraphNode, {
                global: { plugins: [vuetify] },
                props: {
                    ...baseProps,
                    node: nodeData
                }
            });
            
            await wrapper.trigger("click");
            expect(wrapper.emitted("click")).toBeTruthy();
            expect(wrapper.emitted("click")[0]).toEqual([nodeData]);
        });
    });
});
