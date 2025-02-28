export function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function formatPrice(price: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(price)
}

export function getPriorityColor(priority: Priority | string): string {
    switch (priority) {
        case 'HIDE': return 'text-gray-400'
        case 'ENABLED': return 'text-primary'
        case 'PRIORITY': return 'text-warning'
        case 'FORCE': return 'text-danger'
        default: return ''
    }
}
