:: REM xcopy args:
:: /D:m-d-y     Copies files changed on or after the specified date.
::              If no date is given, copies only those files whose
::              source time is newer than the destination time.
:: /S           Copies directories and subdirectories except empty ones.
:: /C           Continues copying even if errors occur.
:: /Y           Suppresses prompting to confirm you want to overwrite an
::              existing destination file.
:: /I           If destination does not exist and copying more than one file,
::              assumes that destination must be a directory.
@set wd=%~dp0
@echo %wd%
@set args= /D /S /C /Y
:: @echo %args%
@echo "Copying all files from portfolio to %wd%"
@xcopy "C:\Users\Pat\Dropbox\UM Grad School\Portfolio" %wd% %args%
@pause