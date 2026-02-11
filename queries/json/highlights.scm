; JSON highlights query for critique
; Uses captures compatible with themes.ts mappings
; No predicates (like #set! or #eq?) that are unsupported by web-tree-sitter

(pair
  key: (string
    (string_content) @property))

(pair
  value: (string
    (string_content) @string))

(array
  (string
    (string_content) @string))

(number) @number

[
  (true)
  (false)
] @boolean

(null) @constant

(escape_sequence) @string

("\"") @punctuation.delimiter

[
  ","
  ":"
] @punctuation.delimiter

[
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket
