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

; Keep JSON punctuation muted (not operator-red / not full-bright)
("\"") @conceal

; JSON separators should render muted, not like operators
[
  ","
  ":"
] @conceal

[
  "["
  "]"
  "{"
  "}"
] @conceal
