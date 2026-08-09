<script lang="ts">
    import { enhance } from "$app/forms";

    export let isSubscribed: boolean;
    export let targetUserId: string | undefined = undefined;
</script>

<form use:enhance method="POST" action={isSubscribed ? "?/unsubscribe" : "?/subscribe"}>
    {#if targetUserId}
        <input type="hidden" name="targetUserId" value={targetUserId} />
    {/if}
    <button type="submit">
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </button>
</form>
