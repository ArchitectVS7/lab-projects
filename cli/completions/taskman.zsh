#compdef taskman

_taskman() {
  local -a commands
  commands=(
    'login:Configure API credentials'
    'create:Create a new task'
    'list:List tasks'
    'update:Update a task'
    'complete:Mark task as completed'
    'show:Show task details'
    'projects:List projects'
  )
  
  local -a create_opts
  create_opts=(
    '--project[Project ID]'
    '--description[Task description]'
    '--priority[Priority level]:priority:(LOW MEDIUM HIGH URGENT)'
    '--due[Due date]'
    '--assignee[Assignee user ID]'
  )
  
  local -a list_opts
  list_opts=(
    '--project[Filter by project name]'
    '--status[Filter by status]:status:(TODO IN_PROGRESS IN_REVIEW DONE)'
    '--assignee[Filter by assignee email]'
    '--priority[Filter by priority]:priority:(LOW MEDIUM HIGH URGENT)'
    '--limit[Limit number of results]'
  )
  
  local -a update_opts
  update_opts=(
    '--title[New title]'
    '--description[New description]'
    '--status[New status]:status:(TODO IN_PROGRESS IN_REVIEW DONE)'
    '--priority[New priority]:priority:(LOW MEDIUM HIGH URGENT)'
    '--assignee[New assignee ID]'
    '--due[New due date]'
  )
  
  _arguments -C \
    '1: :->command' \
    '*:: :->args'
  
  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        create)
          _arguments $create_opts
          ;;
        list)
          _arguments $list_opts
          ;;
        update)
          _arguments $update_opts
          ;;
      esac
      ;;
  esac
}

_taskman
