_taskman_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  
  # Main commands
  local commands="login create list update complete show projects help"
  
  # If we're completing the first argument (command)
  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    return 0
  fi
  
  # Get the command (first argument)
  local command="${COMP_WORDS[1]}"
  
  # Complete options based on command
  case "${command}" in
    create)
      local create_opts="--project --description --priority --due --assignee --help"
      COMPREPLY=( $(compgen -W "${create_opts}" -- ${cur}) )
      ;;
    list)
      local list_opts="--project --status --assignee --priority --limit --help"
      COMPREPLY=( $(compgen -W "${list_opts}" -- ${cur}) )
      ;;
    update)
      local update_opts="--title --description --status --priority --assignee --due --help"
      COMPREPLY=( $(compgen -W "${update_opts}" -- ${cur}) )
      ;;
    *)
      ;;
  esac
  
  return 0
}

complete -F _taskman_completion taskman
