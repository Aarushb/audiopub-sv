<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2026 the-byte-bender
  
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.
  
  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
<script lang="ts">
    import { enhance } from "$app/forms";
    import title from "$lib/title.js";
    import { onMount } from "svelte";

    export let data;

    onMount(() => title.set("Admin"));
</script>

<h1>Pending Account Approvals</h1>

{#if data.untrustedUsers.length === 0}
    <p>No pending approvals.</p>
{:else}
    <table>
        <thead>
            <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Email</th>
                <th>Bio</th>
                <th>Registered</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            {#each data.untrustedUsers as u}
                <tr>
                    <td>
                        <a href="/user/@{encodeURIComponent(u.name)}">{u.name}</a>
                    </td>
                    <td>{u.displayName}</td>
                    <td>{u.email}</td>
                    <td>{u.bio ? u.bio.slice(0, 120) : ""}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                        <form use:enhance action="?/trust" method="post">
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit">Approve</button>
                        </form>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

<style>
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }

    th,
    td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
    }

    th {
        background-color: #f4f4f4;
        font-weight: bold;
    }

    tr:nth-child(even) {
        background-color: #fafafa;
    }

    button {
        background-color: #333;
        color: #fff;
        padding: 0.4rem 0.8rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background-color: #444;
    }
</style>
