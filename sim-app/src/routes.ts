import GenericLayout from "./layouts/GenericLayout.svelte";
import Home from "./pages/Home.svelte";
import SerialMonitorPage from "./pages/SerialMonitorPage.svelte";

const routes = [
    {
        name: "/",
        component: Home,
        layout: GenericLayout
    },
    {
        name: "/tools/serialmonitor",
        component: SerialMonitorPage,
        layout: GenericLayout
    },
    {
        name: "404",
        path: "404",
        component: Home,
        layout: GenericLayout
    }
];

export default routes;