<script lang="ts">
    import type { ReadlineParser, SerialPort } from "serialport";
    import { Button, Select, TextField, Tooltip } from "smelte";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import SerialConnectionSelector from "./SerialComponents/SerialConnectionSelector.svelte";

    // Configuration
    export let maxHistory: number = 10000;
    export let isDisplayOnly: boolean = false;

    // Event forwarding
    const dispatch = createEventDispatcher<{selectAndOpenSerialPort: {port: SerialPort, parser: ReadlineParser}, selectAndFailToOpenSerialPort: {portPath: string, error: Error}, serialPortClosing: {port: SerialPort, parser: ReadlineParser}}>();

    // Message Tracking
    let currentHistory: Array<{ msg: string, timestamp: string }> = [];
    let parser: ReadlineParser | undefined = undefined;
    let serialPort: SerialPort | undefined = undefined;

    // Scrolling
    let isLockedToBottom: boolean = true;
    let outputArea: Element;
    let isMounted: boolean = false;

    // Timestamps
    let isShowingTimestamps: boolean = false;

    // Send message
    const newlineValueOptions = [
        {
            text: "CRLF",
            value: "\c\n"
        },
        {
            text: "LF",
            value: "\n"
        },
        {
            text: "No Endline",
            value: ""
        }
    ];
    let selectedNewlineValueOption: string = "\n";
    let messageToSend: string = "";
    let isFocused: boolean = false;

    /**
     * Adds the given text message to the history.
     * @param msg The text message to add.
     */
    function addToHistory(msg: string) {
        currentHistory.push({msg: "> " + msg, timestamp: "[" + new Date().toLocaleTimeString() + "] > " + msg });
        if (currentHistory.length > maxHistory) {
            currentHistory = currentHistory.slice(maxHistory - 200);
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
            serialPort.write(messageToSend + '\n', 'ascii', (err) => {
                if (err) {
                    addToHistory("ASHES FAILURE: Failed to send message, error: " + err.message);
                }
                else {
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
        serialPort = event.detail.port;
        parser.on('data', onSerialData);

        // Forward event
        dispatch('selectAndOpenSerialPort', event.detail);
    }

    /**
     * Handles event when serial selector closes a connection
     */
    function onSerialPortClose(event: CustomEvent) {
        parser.off('data', onSerialData);
        parser = undefined;
        serialPort = undefined;

        // Forward event
        dispatch('serialPortClosing', event.detail);
        console.log(event);
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


<div bind:this={outputArea} class="scrollbars overflow-y-scroll max-h-96">
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
        on:selectAndFailToOpenSerialPort={ (event) => { dispatch('selectAndFailToOpenSerialPort', event.detail); } }
        />
    <div style="display: flex; flex-direction: row; align-items: center;">
        <div class="flex-grow mr-1">
            <TextField label="Send Message via Serial" bind:focused={isFocused} bind:value={messageToSend} dense />
        </div>
        <div class="w-36 ml-1">
            <Select items={newlineValueOptions} bind:value={selectedNewlineValueOption} dense />
        </div>
    </div>
    
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