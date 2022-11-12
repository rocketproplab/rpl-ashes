<script lang="ts">
    import { Select, TextField } from "smelte";
    import { createEventDispatcher } from 'svelte'

    // Supported baud rates
    const baudRates = [
        110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200
    ];
    const defaultValue = 9600;

    // Dispatcher for event forwarding.
    const dispatch = createEventDispatcher<{change: number}>();

    // Props
    export let value: number = defaultValue;
    export let disabled: boolean = false;
    export let classes: string = "";

    // Internal state
    let state: string = value.toString();

</script>

{#if disabled}
    <TextField dense classes={classes} label="Baud Rate" disabled value={state.toString()} />
{:else}
    <Select dense classes={classes} label="Baud Rate" bind:value={state} items={ baudRates.map( val => val.toString() ) } on:change={ () => { dispatch('change',  Number(state)); }} />
{/if}
