<script lang="ts">
    import { enhance } from "$app/forms";

    export let isSubscribed: boolean;
</script>

<form use:enhance method="POST" action={isSubscribed ? "?/unsubscribe" : "?/subscribe"}>
    <button type="submit">
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </button>
</form>
