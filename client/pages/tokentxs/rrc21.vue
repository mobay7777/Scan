<template>
    <section>
        <table-token-tx-rrc21/>
    </section>
</template>

<script>
import TableTokenTxRrc21 from '~/components/TableTokenTxRrc21'

export default {
    components: {
        TableTokenTxRrc21
    },
    async mounted () {
        // Init breadcrumbs data.
        this.$store.commit('breadcrumb/setItems', { name: 'tokentxs-rrc21', to: { name: 'tokentxs-rrc21' } })
    },
    head () {
        return {
            title: 'Token RRC21 Transfers'
        }
    }
}
</script>

<style scoped>

</style>
