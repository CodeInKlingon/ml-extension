const textarea = document.createElement('textarea')
export const decodeHtmlEntities = (text: string): string => {
	textarea.innerHTML = text
	return textarea.value
}