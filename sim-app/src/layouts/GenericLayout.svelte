<script lang="ts">
    import { NavigationDrawer, List, ListItem, Button } from 'smelte';
    import { Route, Navigate } from 'svelte-router-spa';

    // Incoming Svelte-Router-SPA params for layout
    export let currentRoute;
    export let params = {};

    // State for showing
    let show = false;

    // Menu for routes
    const toolsMenu = [
      { to: "/tools/serialmonitor", text: 'Serial Monitor' },
    ];
    const hardwareEmulatorsMenu = [
        { to: "/hardware-emulation/fuel-tank-valve", text: "Fuel Tank Valve" },
    ]

    console.log("/tools/serialmonitor")
    console.log(currentRoute.path)
    console.log(currentRoute.path === "/tools/serialmonitor")

</script>

<div>
    <header class="fixed top-0 w-full items-center flex-wrap flex left-0 z-30 p-0 h-16 shadow bg-primary-300 dark:bg-dark-600">
        <Button class="mx-3" icon="menu" small color="dark" on:click={() => {show = !show;}}>
        </Button>

        <Navigate to="/" >
            <div class="px-2 flex items-center">
                <img alt="RPL" src="/logo.png" width="84">
            </div>
        </Navigate>
        
        <h6 class="pl-1 text-white tracking-widest font-thin text-lg">ASHES</h6>
    </header>

    <NavigationDrawer  persistent={true} bind:show={show}>
        <h6 class="ml-3 mt-3">
            Tools
        </h6>
        <List items={toolsMenu}>
            {#each toolsMenu as item}
            {#if currentRoute.path !== item.to}
            <Navigate to={item.to} >
                <ListItem
                        selected={currentRoute.path === item.to}
                        {...item}
                        dense
                        />
            </Navigate>
            {:else}
            <ListItem
                    selected={currentRoute.path === item.to}
                    {...item}
                    dense
                    />
            {/if}
            {/each}
        </List>
        <hr />
        <h6 class="ml-3 pt-3">
            Hardware Emulators
        </h6>
        <List items={hardwareEmulatorsMenu}>
            {#each hardwareEmulatorsMenu as item}
            {#if currentRoute.path !== item.to}
            <Navigate to={item.to} >
                <ListItem
                        selected={currentRoute.path === item.to}
                        {...item}
                        dense
                        />
            </Navigate>
            {:else}
            <ListItem
                    selected={currentRoute.path === item.to}
                    {...item}
                    dense
                    />
            {/if}
            {/each}
        </List>
    </NavigationDrawer>

    <div class="mt-16 mx-16">
        <Route {currentRoute} {params} />
    </div>
</div>
