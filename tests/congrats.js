
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

const encodedString = 'Pbatenghyngvbaf ba ohvyqvat n pbqr-rqvgvat ntrag!';
const decodedString = rot13(encodedString);
console.log(decodedString);
