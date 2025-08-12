import { createApp } from "vue";
import ContentApp from "./ContentApp.vue";
import SubmitPage from "./pages/SubmitPage.vue";
import { createRouter, createWebHistory } from "vue-router";

const rootEl = document.createElement("div");
rootEl.id = "app";
document.body.appendChild(rootEl);

const app = createApp(ContentApp);

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/l/:leagueId/:roundId/submit/", component: SubmitPage },
    ],
});

app.use(router);
app.mount(rootEl);