<!--
  This file is part of the audiopub project.
  
  Copyright (C) 2024 the-byte-bender
  
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
    import title from "$lib/title";
    import type { ActionData } from "./$types";
    import { onMount } from "svelte";

    export let form: ActionData;

    onMount(() => title.set("Register"));
</script>

<h1>Register</h1>

<form use:enhance method="POST">
    {#if form?.message}
        <div class="error-message" role="alert">
            {form.message}
        </div>
    {/if}

    <div class="form-group">
        <label for="username">Username:</label>
        <input
            type="text"
            id="username"
            name="username"
            required
            autofocus
            minlength="3"
            maxlength="24"
            class="form-control"
        />
    </div>
    <div class="form-group">
        <label for="email">Email:</label>
        <input
            type="email"
            id="email"
            name="email"
            required
            class="form-control"
        />
    </div>
    <div class="form-group">
        <label for="password">Password:</label>
        <input
            type="password"
            id="password"
            name="password"
            required
            minlength="8"
            maxlength="64"
            class="form-control"
        />
    </div>
    <div class="form-group checkbox-group">
        <label class="checkbox-label" for="agreeReview">
            <input
                type="checkbox"
                id="agreeReview"
                name="agreeReview"
                required
            />
            I agree to the account approval process
        </label>
        <p class="agreement-text">
            My account must be approved by a moderator before I can fully
            participate on the platform. I understand that:
        </p>
        <ul class="agreement-list">
            <li>
                The first audio I upload will need to pass review before it is
                shown publicly on the site.
            </li>
            <li>
                I will not be able to upload additional audio until my account
                has been approved.
            </li>
            <li>
                I will not be able to start a live stream until my account has
                been approved.
            </li>
            <li>
                Commenting and live chat are available to me immediately, even
                before my account is approved.
            </li>
        </ul>
    </div>
    <button type="submit" class="btn">Register</button>
</form>

<style>
    .error-message {
        color: #721c24;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        padding: 0.75rem;
        margin-bottom: 1rem;
    }

    h1 {
        text-align: center;
        margin-bottom: 1rem;
        color: #333;
    }

    form {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .form-group {
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    label {
        margin-bottom: 0.5rem;
        font-weight: bold;
        color: #555;
    }

    .form-control {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        transition: border-color 0.3s ease-in-out;
    }

    .form-control:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        background-color: #007bff;
        color: white;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;
    }

    .btn:hover {
        background-color: #0056b3;
    }

    .checkbox-group {
        align-items: flex-start;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: bold;
        color: #555;
        cursor: pointer;
        margin-bottom: 0;
    }

    .checkbox-label input[type="checkbox"] {
        width: auto;
        flex-shrink: 0;
    }

    .agreement-text {
        margin: 0.5rem 0 0;
        color: #666;
        font-size: 0.9rem;
    }

    .agreement-list {
        margin: 0.25rem 0 0;
        padding-left: 1.25rem;
        color: #555;
        font-size: 0.9rem;
        text-align: left;
    }
</style>
