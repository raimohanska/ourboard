const search = new URLSearchParams(location.search)

const embedded = search.get("embedded") === "true"

export const isEmbedded = () => embedded
