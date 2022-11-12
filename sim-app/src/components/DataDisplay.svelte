<script lang="ts">
    import { Button, Dialog } from "smelte";
    import { createEventDispatcher } from "svelte";


    export let columns: Array<{fieldName: string, displayedAsText: string, canEdit: boolean}> = [];
    export let data: Array<object> = [];
    export let shouldRoundNumbers = true;

    let dispatch = createEventDispatcher<{update: {dataIndex: number, newValue: number}}>();

    let isOpen: boolean = false;
    let selectedDataIndex = -1;
    let valueToSet = "";

    let hasOneEditColumn = false;
    for (const column of columns) {
        if (column.canEdit) {
            hasOneEditColumn = true;
        }
    }

    function formatData(incomingDatum) {
        if (typeof incomingDatum === 'number' && shouldRoundNumbers) {
            return (Math.round(incomingDatum * 1000) / 1000).toLocaleString();
        }
        return incomingDatum.toString();
    }

</script>

<table>
    <tr>
        {#each columns as column, i}
            <td><span class="m-1">{column.displayedAsText}</span></td>
        {/each}
        <td><span class="m-1">Edit</span></td>
    </tr>

    {#each data as incomingDatum, i}
        <tr>
            {#each columns as column, j}
                <td>
                    {#if incomingDatum.hasOwnProperty(column.fieldName)}
                        <span class="m-1">{formatData(incomingDatum[column.fieldName])}</span>
                    {/if}
                </td>
            {/each}
            
            <td>
                {#if incomingDatum.hasOwnProperty("canEdit") && incomingDatum["canEdit"]}
                    <Button icon="edit" small/>
                {/if}
            </td>
        </tr>
    {/each}
</table>