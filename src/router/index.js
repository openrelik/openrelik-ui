/*
Copyright 2024 Google LLC

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

// Composables
import { createRouter, createWebHistory } from "vue-router";

// Import the default layout that wrapps all other views with an AppBar etc.
import Default from "@/layouts/default/Default.vue";

// Import App views
import Login from "@/views/Login.vue";
import Home from "@/views/Home.vue";
import Folder from "@/views/Folder.vue";
import File from "@/views/File.vue";

// Import Pinia stores
import { useUserStore } from "@/stores/user";

// Routes
const routes = [
  {
    path: "/login",
    name: "login",
    component: Login,
  },
  {
    path: "/",
    component: Default,
    children: [
      {
        path: "",
        name: "home",
        component: Home,
        props: true,
      },
      {
        path: "/folder/:folderId",
        children: [
          {
            path: "",
            name: "folder",
            component: Folder,
            props: true,
          },
          {
            path: "file/:fileId",
            name: "file",
            component: File,
            props: true,
          },
          {
            path: "file/:fileId/details",
            name: "fileDetails",
            component: File,
            props: true,
          },
          {
            path: "file/:fileId/content",
            name: "fileContent",
            component: File,
            props: true,
          },
          {
            path: "file/:fileId/workflows",
            name: "fileWorkflows",
            component: File,
            props: true,
          },
        ],
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  if (to.name === "login") {
    next();
  } else if (userStore.user === null) {
    userStore
      .setUser()
      .then(() => {
        if (userStore.user === null) {
          next({ name: "login" });
        } else {
          next();
        }
      })
      .catch((error) => {
        if (error.response.status === 401) {
          next({ name: "login" });
          return;
        }
      });
  } else {
    next();
  }
});

export default router;
