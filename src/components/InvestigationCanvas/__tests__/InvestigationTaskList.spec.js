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
import InvestigationTaskList from "../InvestigationTaskList.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { createTestingPinia } from "@pinia/testing";

const vuetify = createVuetify({
  components,
  directives,
});

describe("InvestigationTaskList.vue", () => {
    // Stub VDataTable to render the specific slot we care about
    const VDataTableStub = {
        props: ["items"],
        template: `
            <div class="v-data-table-stub">
                <div v-for="item in items" :key="item.id" class="row-item">
                    <slot name="item.task" :item="item"></slot>
                </div>
            </div>
        `
    };

    it("renders empty list", () => {
        const wrapper = mount(InvestigationTaskList, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: {}
                            }
                        }
                    })
                ],
                stubs: { VDataTable: VDataTableStub }
            }
        });
        
        expect(wrapper.find(".v-data-table-stub").exists()).toBe(true);
        expect(wrapper.findAll(".row-item").length).toBe(0);
    });

    it("renders list of tasks", async () => {
         const wrapper = mount(InvestigationTaskList, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: {
                                    tasks: [
                                        { id: "t1", task: "Task 1", status: "PENDING" },
                                        { id: "t2", task: "Task 2", status: "COMPLETED" }
                                    ]
                                }
                            }
                        },
                        stubActions: false
                    })
                ],
                stubs: { VDataTable: VDataTableStub }
            }
        });
        
        await wrapper.vm.$nextTick();
        
        const rows = wrapper.findAll(".row-item");
        expect(rows.length).toBe(2);
        expect(rows[0].text()).toContain("Task 1");
        expect(rows[1].text()).toContain("Task 2");
    });
    
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
        { status: "PENDING", icon: "mdi-clock-outline", color: "grey" },
        { status: "UNKNOWN_STATUS", icon: "mdi-circle-outline", color: "grey" } 
    ];

    it.each(statuses)("renders correct icon and color for status $status", async ({ status, icon, color }) => {
        const wrapper = mount(InvestigationTaskList, {
            global: {
                plugins: [
                    vuetify,
                    createTestingPinia({
                        initialState: {
                            investigation: {
                                sessionData: {
                                    tasks: [
                                        { id: "t1", task: "Task 1", status: status }
                                    ]
                                }
                            }
                        },
                        stubActions: false
                    })
                ],
                stubs: { VDataTable: VDataTableStub }
            }
        });
        
        await wrapper.vm.$nextTick();
        
        const row = wrapper.find(".row-item");
        const iconCmp = row.findComponent({ name: "VIcon" });
        
        expect(iconCmp.exists()).toBe(true);
        expect(iconCmp.props("icon")).toBe(icon);
        expect(iconCmp.props("color")).toBe(color);
    });
});
