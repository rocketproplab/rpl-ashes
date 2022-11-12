<script lang="ts">
    import type { ReadlineParser, SerialPort } from "serialport";
    import { Button, TextField, Tooltip } from "smelte";
    import { onDestroy, onMount } from "svelte";
    import SerialConnectionSelector from "./SerialComponents/SerialConnectionSelector.svelte";

    // Configuration
    export let maxHistory: number = 100000;
    export let isDisplayOnly: boolean = false;

    // Message Tracking
    let currentHistory: Array<{ msg: string, timestamp: string }> = [];
    let parser: ReadlineParser | undefined = undefined;
    
    // Scrolling
    let isLockedToBottom: boolean = true;
    let outputArea: Element;
    let isMounted: boolean = false;

    // Timestamps
    let isShowingTimestamps: boolean = false;

    // Send message
    let messageToSend: string = "";
    let isFocused: boolean = false;

    /**
     * Adds the given text message to the history.
     * @param msg The text message to add.
     */
    function addToHistory(msg: string) {
        currentHistory.push({msg: "> " + msg, timestamp: "[" + new Date().toLocaleTimeString() + "] > " + msg });
        if (currentHistory.length > maxHistory) {
            currentHistory.shift();
        }
        currentHistory = currentHistory; // Svelte trick to force a redraw.
    }

    /**
     * Handles keyboard events when typing in the input bar.
     * @param event
     */
    function onInput(event: KeyboardEvent) {
        
        // If hitting enter
        if (event.key !== undefined && event.key == "Enter") {
            parser.write(messageToSend, 'ascii', (err) => {
                if (err) {
                    addToHistory("ASHES FAILURE: Failed to send message, error: " + err.message);
                }
                else {
                    console.log("Wrote data.");
                }
            });
            messageToSend = ""; // Clear msg
        }
    }

    /**
     * Handles event when serial selector opens a connection
     */
    function onSerialPortOpen(event: CustomEvent<{port: SerialPort, parser: ReadlineParser}>) {
        parser = event.detail.parser;
        parser.on('data', onSerialData);
    }

    /**
     * Handles event when serial selector closes a connection
     */
    function onSerialPortClose() {
        parser.off('data', onSerialData);
        parser = undefined;
    }

    /**
     * Handles event when data is received over serial.
     */
    function onSerialData(data: string) {

        addToHistory(data);

        if (isMounted && isLockedToBottom) {
            outputArea.scroll( {top: outputArea.scrollHeight, behavior: 'auto'} );
        }
        
    }

    // Keep track of mounting state so scrolling doesn't throw a
    // null reference error.
    onMount( () => { isMounted = true; });
    onDestroy( () => { isMounted = false; })

</script>

<div style="display: flex; flex-direction: row;">
    <div style="flex-grow: 1" >
        <h4>Serial Monitor</h4>
    </div>
    <div style="display: flex; gap: 2px; flex-direction: row;">
        <Tooltip>
            <div slot="activator">
                <Button small on:click={() => { isShowingTimestamps = !isShowingTimestamps; } } icon={isShowingTimestamps ? "watch_off" : "watch"} />
            </div>
            {isShowingTimestamps ? "Hide Timestamps" : "Show Timestamps"}
        </Tooltip>
        
        <Tooltip>
            <div slot="activator">
                <Button small on:click={() => { isLockedToBottom = !isLockedToBottom; } } icon={isLockedToBottom ? "unfold_more" : "expand_more"} />
            </div>
            {isLockedToBottom ? "Unlock Scroll" : "Lock Scroll to Most Recent"}
        </Tooltip>
        
        <Tooltip>
            <div slot="activator">
                <Button small on:click={() => { currentHistory = []; }} icon="clear_all" />
            </div>
            Clear History
        </Tooltip>
    </div>
    
</div>


<div bind:this={outputArea} class="scrollbars overflow-y-scroll h-96">
    <pre>
        {#if isShowingTimestamps}
            {#each currentHistory as entry}
                {entry.timestamp + "\n"}
            {/each}
        {:else}
            {#each currentHistory as entry}
                {entry.msg + "\n"}
            {/each}
        {/if}
    </pre>
</div>

{#if !isDisplayOnly}
<div>
    <SerialConnectionSelector 
        on:selectAndOpenSerialPort={ onSerialPortOpen }
        on:serialPortClosing={ onSerialPortClose }
        />
    <TextField bind:focused={isFocused} bind:value={messageToSend} dense />
</div>
{/if}

<svelte:window on:keydown={ (inputEvent) => {if (isFocused) { onInput(inputEvent); }} } />



<style scoped>
    .scrollbars::-webkit-scrollbar {
        background-color: transparent;
        width: 2px;
    }

    .scrollbars::-webkit-scrollbar-thumb {
        background-color: #d6dee1;
        border-radius: 2px;
    }
    .scrollbars::-webkit-scrollbar-thumb:hover {
        background-color: #a8bbbf;
    }
</style>