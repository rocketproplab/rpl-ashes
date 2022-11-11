<script>
	import "smelte/src/tailwind.css" ; // Import Tailwind utils for Smelte

	import routes from './routes';
	import { Router } from "svelte-router-spa";

</script>

<main>
	<Router routes={routes} />
</main>

<style>

</style>