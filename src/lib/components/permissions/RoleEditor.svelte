<script lang="ts">
    import { Permissions } from '$lib/model/permissions';
	import { DataArr } from 'drizzle-struct/front-end';
	import { onMount } from 'svelte';

    interface Props {
        role: Permissions.RoleData;
    }

    const { role }: Props = $props();

    let permissions: Permissions.RoleRulesetDataArr = $state(new DataArr(Permissions.RoleRuleset, []));
    let entitlements: Permissions.EntitlementDataArr = $state(new DataArr(Permissions.Entitlement, []));
    let groups = $state<{
        [key: string]: Permissions.EntitlementData[];
    }>({});

    onMount(() => {
        permissions = Permissions.getRolePermissions(role);
        entitlements = Permissions.getEntitlements();
        const unsubGroups = entitlements.subscribe((data) => {
            groups = data.reduce((acc, entitlement) => {
                const g = entitlement.data.group;
                if (!g) return acc;
                if (!acc[g]) {
                    acc[g] = [];
                }
                acc[g].push(entitlement);
                return acc;
            }, {} as { [key: string]: Permissions.EntitlementData[] });
        });

        return () => {
            unsubGroups();
        }
    });
</script>


<div class="container">
    {#each Object.keys(groups) as group}
        <div class="row mb-3">
            <h3>{group}</h3>
        </div>
        <div class="row mb-3">
            <ul class="list-group">
                {#each groups[group] as entitlement}
                    <li class="list-item">
                        <div class="form-check form-switch d-flex justify-content-between align-items-middle">
                            <label class="form-check-label" for="example-switch-1">
                                This is a switch
                            </label>
                            <input class="form-check-input" type="checkbox" role="switch" value="" id="example-switch-1">
                        </div>
                    </li>
                {/each}
            </ul>
        </div>
    {/each}
</div>